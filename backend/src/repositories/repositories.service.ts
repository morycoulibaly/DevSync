import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { SecretCryptoService } from '../security/secret-crypto.service';
import { CreateRepositoryDto } from './create-repository.dto';

@Injectable()
export class RepositoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly secretCrypto: SecretCryptoService,
    private readonly config: ConfigService,
  ) {}

  async listForUser(userId: string) {
    const repositories = await this.prisma.repository.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, owner: true, name: true, fullName: true, webhookToken: true, isActive: true, createdAt: true },
    });

    return repositories.map(({ webhookToken, ...repository }) => ({
      ...repository,
      webhookUrl: this.createWebhookUrl(webhookToken),
    }));
  }

  async createForUser(userId: string, details: CreateRepositoryDto) {
    const owner = details.owner.trim();
    const name = details.name.trim();
    const fullName = `${owner}/${name}`;
    const webhookToken = randomBytes(32).toString('hex');
    const webhookSecret = randomBytes(32).toString('base64url');

    try {
      const repository = await this.prisma.repository.create({
        data: {
          userId,
          owner,
          name,
          fullName,
          webhookToken,
          webhookSecret: this.secretCrypto.encrypt(webhookSecret),
        },
        select: { id: true, owner: true, name: true, fullName: true, isActive: true, createdAt: true },
      });

      // Le secret en clair n’est renvoyé qu’une fois pour configurer GitHub.
      return {
        ...repository,
        webhookUrl: this.createWebhookUrl(webhookToken),
        webhookSecret,
      };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(`${fullName} est déjà suivi dans ton espace.`);
      }
      throw error;
    }
  }

  async rotateWebhookSecret(userId: string, repositoryId: string) {
    const webhookSecret = randomBytes(32).toString('base64url');
    const repository = await this.prisma.repository.findFirst({
      where: { id: repositoryId, userId },
      select: { id: true, owner: true, name: true, fullName: true, webhookToken: true },
    });

    if (!repository) throw new NotFoundException('Dépôt introuvable.');

    await this.prisma.repository.update({
      where: { id: repository.id },
      data: { webhookSecret: this.secretCrypto.encrypt(webhookSecret) },
    });

    // Le nouveau secret n'est renvoyé qu'à cette requête.
    return {
      ...repository,
      webhookUrl: this.createWebhookUrl(repository.webhookToken),
      webhookSecret,
    };
  }

  private createWebhookUrl(token: string) {
    const publicApiUrl = this.config.get<string>('API_PUBLIC_URL', 'http://localhost:4000');
    return `${publicApiUrl.replace(/\/$/, '')}/api/webhooks/github/${token}`;
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
