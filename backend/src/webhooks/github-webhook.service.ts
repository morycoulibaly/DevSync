import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EventStatus, EventType, Prisma } from '../../generated/prisma';
import { PrismaService } from '../database/prisma.service';
import { SecretCryptoService } from '../security/secret-crypto.service';

interface IncomingWebhook {
  webhookToken: string;
  signature?: string;
  deliveryId?: string;
  eventName?: string;
  rawBody?: Buffer;
}

interface NormalizedEvent {
  type: EventType;
  action: string | null;
  status: EventStatus | null;
  actorLogin: string;
  actorAvatar: string | null;
  title: string;
  url: string | null;
  occurredAt: Date;
}

type JsonObject = Record<string, unknown>;

@Injectable()
export class GitHubWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly secretCrypto: SecretCryptoService,
  ) {}

  async process(webhook: IncomingWebhook) {
    if (!webhook.deliveryId || !webhook.eventName || !webhook.signature) {
      throw new BadRequestException('En-têtes GitHub requis manquants.');
    }
    if (!webhook.rawBody) {
      throw new InternalServerErrorException('Le body brut du webhook est indisponible.');
    }

    const repository = await this.prisma.repository.findUnique({
      where: { webhookToken: webhook.webhookToken },
    });
    if (!repository || !repository.isActive) {
      throw new NotFoundException('Dépôt introuvable ou désactivé.');
    }

    const webhookSecret = this.secretCrypto.decrypt(repository.webhookSecret);
    this.verifySignature(webhook.rawBody, webhook.signature, webhookSecret);
    const payload = this.parsePayload(webhook.rawBody);
    const event = this.normalizeEvent(webhook.eventName, payload);

    // Les événements non pris en charge sont acceptés, mais ne sont pas stockés.
    if (!event) return { received: true, stored: false, reason: 'unsupported_event' };

    try {
      await this.prisma.event.create({
        data: {
          repositoryId: repository.id,
          deliveryId: webhook.deliveryId,
          ...event,
          payload: payload as Prisma.InputJsonValue,
        },
      });
      return { received: true, stored: true };
    } catch (error) {
      // GitHub peut renvoyer la même livraison après un timeout. La contrainte
      // unique sur deliveryId transforme ce rejeu en réponse idempotente.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { received: true, stored: false, reason: 'duplicate_delivery' };
      }
      throw error;
    }
  }

  private verifySignature(rawBody: Buffer, signature: string, secret: string) {
    const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
    const receivedBytes = Buffer.from(signature);
    const expectedBytes = Buffer.from(expected);

    if (
      receivedBytes.length !== expectedBytes.length ||
      !timingSafeEqual(receivedBytes, expectedBytes)
    ) {
      throw new UnauthorizedException('Signature GitHub invalide.');
    }
  }

  private parsePayload(rawBody: Buffer): JsonObject {
    try {
      const payload: unknown = JSON.parse(rawBody.toString('utf8'));
      if (!isObject(payload)) throw new Error('Le payload JSON doit être un objet.');
      return payload;
    } catch {
      throw new BadRequestException('Le payload GitHub doit être un JSON valide.');
    }
  }

  private normalizeEvent(eventName: string, payload: JsonObject): NormalizedEvent | null {
    const sender = asObject(payload.sender);
    const actorLogin = readString(sender.login) ?? 'unknown';
    const actorAvatar = readString(sender.avatar_url);
    const action = readString(payload.action);
    const now = new Date();

    if (eventName === 'push') {
      const headCommit = asObject(payload.head_commit);
      const branch = readString(payload.ref)?.replace('refs/heads/', '');
      return {
        type: EventType.PUSH,
        action: null,
        status: null,
        actorLogin,
        actorAvatar,
        title: readString(headCommit.message) ?? `Push sur ${branch ?? 'une branche'}`,
        url: readString(payload.compare),
        occurredAt: readDate(headCommit.timestamp) ?? now,
      };
    }

    if (eventName === 'pull_request') {
      const pullRequest = asObject(payload.pull_request);
      const merged = pullRequest.merged === true;
      const closed = pullRequest.state === 'closed';
      return {
        type: EventType.PULL_REQUEST,
        action,
        status: merged ? EventStatus.MERGED : closed ? EventStatus.CLOSED : EventStatus.OPEN,
        actorLogin,
        actorAvatar,
        title: readString(pullRequest.title) ?? 'Pull request sans titre',
        url: readString(pullRequest.html_url),
        occurredAt: readDate(pullRequest.updated_at) ?? now,
      };
    }

    if (eventName === 'issues') {
      const issue = asObject(payload.issue);
      return {
        type: EventType.ISSUE,
        action,
        status: issue.state === 'closed' ? EventStatus.CLOSED : EventStatus.OPEN,
        actorLogin,
        actorAvatar,
        title: readString(issue.title) ?? 'Issue sans titre',
        url: readString(issue.html_url),
        occurredAt: readDate(issue.updated_at) ?? now,
      };
    }

    return null;
  }
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asObject(value: unknown): JsonObject {
  return isObject(value) ? value : {};
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
