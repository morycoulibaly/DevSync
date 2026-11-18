import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChannelType, EventType } from '../../generated/prisma';
import { PrismaService } from '../database/prisma.service';
import { SecretCryptoService } from '../security/secret-crypto.service';

const DISCORD_WEBHOOK_PATH = /^\/api\/webhooks\/[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+\/?$/;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly secretCrypto: SecretCryptoService,
  ) {}

  async listChannels(userId: string) {
    const channels = await this.prisma.notificationChannel.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, type: true, enabled: true, createdAt: true },
    });
    return channels;
  }

  async createDiscordChannel(userId: string, target: string) {
    this.validateDiscordWebhook(target);
    const channel = await this.prisma.notificationChannel.create({
      data: {
        userId,
        type: ChannelType.DISCORD,
        target: this.secretCrypto.encrypt(target),
      },
      select: { id: true, type: true, enabled: true, createdAt: true },
    });
    return channel;
  }

  async setChannelEnabled(userId: string, channelId: string, enabled: boolean) {
    const channel = await this.prisma.notificationChannel.findFirst({
      where: { id: channelId, userId },
      select: { id: true },
    });
    if (!channel) throw new NotFoundException('Canal de notification introuvable.');

    return this.prisma.notificationChannel.update({
      where: { id: channel.id },
      data: { enabled },
      select: { id: true, type: true, enabled: true, createdAt: true },
    });
  }

  async deleteChannel(userId: string, channelId: string) {
    const result = await this.prisma.notificationChannel.deleteMany({
      where: { id: channelId, userId },
    });
    if (result.count === 0) throw new NotFoundException('Canal de notification introuvable.');
    return { deleted: true };
  }

  async sendTest(userId: string, channelId: string) {
    const channel = await this.findDiscordChannel(userId, channelId);
    await this.sendDiscordMessage(channel.target, {
      content: '✅ DevSync est bien connecté à Discord. Les prochains événements GitHub pourront apparaître ici.',
      allowed_mentions: { parse: [] },
    });
    return { sent: true };
  }

  async getEnabledChannelIdsForEvent(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { repository: { select: { userId: true } } },
    });
    if (!event) return [];

    const channels = await this.prisma.notificationChannel.findMany({
      where: { userId: event.repository.userId, enabled: true, type: ChannelType.DISCORD },
      select: { id: true },
    });
    return channels.map((channel) => channel.id);
  }

  async notifyForEvent(eventId: string, channelId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { repository: { select: { fullName: true, userId: true } } },
    });
    if (!event) return;

    const channel = await this.prisma.notificationChannel.findFirst({
      where: { id: channelId, userId: event.repository.userId, enabled: true, type: ChannelType.DISCORD },
    });
    // Le canal peut avoir été désactivé ou supprimé alors que le job attendait.
    if (!channel) return;

    const message = formatEventMessage(event);
    try {
      await this.sendDiscordMessage(this.secretCrypto.decrypt(channel.target), message);
    } catch {
      // Une URL Discord ou un contenu de livraison ne doit jamais apparaître dans les logs.
      throw new Error(`Échec de l’envoi vers le canal ${channel.id}.`);
    }
  }

  private async findDiscordChannel(userId: string, channelId: string) {
    const channel = await this.prisma.notificationChannel.findFirst({
      where: { id: channelId, userId, type: ChannelType.DISCORD },
    });
    if (!channel) throw new NotFoundException('Canal Discord introuvable.');
    return { ...channel, target: this.secretCrypto.decrypt(channel.target) };
  }

  private validateDiscordWebhook(value: string) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new BadRequestException('Saisis une URL de webhook Discord valide.');
    }

    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'discord.com' ||
      url.port !== '' ||
      url.username ||
      url.password ||
      !DISCORD_WEBHOOK_PATH.test(url.pathname) ||
      url.search ||
      url.hash
    ) {
      throw new BadRequestException('Cette URL ne correspond pas à un webhook Discord autorisé.');
    }
  }

  private async sendDiscordMessage(target: string, body: { content: string; allowed_mentions: { parse: string[] } }) {
    this.validateDiscordWebhook(target);
    let response: Response;
    try {
      response = await fetch(`${target}?wait=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        redirect: 'error',
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      throw new BadGatewayException('Discord ne répond pas. Réessaie dans quelques instants.');
    }
    if (!response.ok) {
      // Ne pas propager le corps de Discord : il peut contenir des données de requête.
      throw new BadGatewayException(`Discord a refusé le message (HTTP ${response.status}).`);
    }
  }
}

function formatEventMessage(event: {
  type: EventType;
  action: string | null;
  actorLogin: string;
  title: string;
  url: string | null;
  repository: { fullName: string };
}) {
  const eventName: Record<EventType, string> = {
    [EventType.PUSH]: 'Push',
    [EventType.PULL_REQUEST]: 'Pull request',
    [EventType.ISSUE]: 'Issue',
    [EventType.OTHER]: 'Événement GitHub',
  };
  const action = event.action ? ` · ${event.action}` : '';
  const lines = [
    `**${eventName[event.type]}${action}** · ${event.repository.fullName}`,
    `@${event.actorLogin} : ${event.title.slice(0, 700)}`,
  ];
  if (event.url) lines.push(event.url);
  return { content: lines.join('\n').slice(0, 1900), allowed_mentions: { parse: [] } };
}
