import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Chiffre les secrets GitHub avant leur stockage dans PostgreSQL. */
@Injectable()
export class SecretCryptoService {
  constructor(private readonly config: ConfigService) {}

  encrypt(plainText: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
  }

  decrypt(encryptedText: string): string {
    const [version, encodedIv, encodedTag, encodedData] = encryptedText.split(':');
    if (version !== 'v1' || !encodedIv || !encodedTag || !encodedData) {
      throw new InternalServerErrorException('Format du secret de webhook inconnu.');
    }

    try {
      const decipher = createDecipheriv('aes-256-gcm', this.getKey(), Buffer.from(encodedIv, 'base64url'));
      decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(encodedData, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new InternalServerErrorException('Impossible de déchiffrer le secret du webhook.');
    }
  }

  private getKey(): Buffer {
    const encodedKey = this.config.get<string>('APP_ENCRYPTION_KEY');
    if (!encodedKey || !/^[\da-f]{64}$/i.test(encodedKey)) {
      throw new InternalServerErrorException(
        'APP_ENCRYPTION_KEY doit contenir exactement 64 caractères hexadécimaux.',
      );
    }
    return Buffer.from(encodedKey, 'hex');
  }
}
