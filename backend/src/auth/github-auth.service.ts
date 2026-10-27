import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';

const SESSION_COOKIE = 'devsync_session';
const STATE_COOKIE = 'devsync_oauth_state';
const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 7;

interface GitHubProfile {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface SessionPayload {
  userId: string;
  expiresAt: number;
}

@Injectable()
export class GitHubAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  createAuthorizationUrl(): { url: string; state: string } {
    const clientId = this.config.get<string>('GITHUB_CLIENT_ID');
    if (!clientId) throw new ServiceUnavailableException('GitHub OAuth n’est pas configuré.');

    const state = randomBytes(32).toString('hex');
    const redirectUri = this.getCallbackUrl();
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', 'read:user user:email');
    url.searchParams.set('state', state);
    return { url: url.toString(), state };
  }

  async completeLogin(code: string, state: string, stateCookie?: string | null) {
    if (!stateCookie || !safeStringEqual(state, stateCookie)) {
      throw new UnauthorizedException('La vérification OAuth a échoué. Recommence la connexion.');
    }

    const clientId = this.config.get<string>('GITHUB_CLIENT_ID');
    const clientSecret = this.config.get<string>('GITHUB_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException('GitHub OAuth n’est pas configuré.');
    }

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: this.getCallbackUrl(),
      }),
    });
    const tokenResult: unknown = await tokenResponse.json();
    const accessToken = readString(asObject(tokenResult).access_token);
    if (!tokenResponse.ok || !accessToken) {
      throw new UnauthorizedException('GitHub n’a pas accepté le code de connexion.');
    }

    const profileResponse = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    const profile: unknown = await profileResponse.json();
    if (!profileResponse.ok || !isGitHubProfile(profile)) {
      throw new UnauthorizedException('Impossible de lire le profil GitHub.');
    }

    // Le token OAuth ne sert qu’à identifier le profil et n’est pas conservé.
    const user = await this.prisma.user.upsert({
      where: { githubId: profile.id },
      create: {
        githubId: profile.id,
        githubLogin: profile.login,
        name: profile.name,
        email: profile.email,
        avatarUrl: profile.avatar_url,
      },
      update: {
        githubLogin: profile.login,
        name: profile.name,
        email: profile.email,
        avatarUrl: profile.avatar_url,
      },
      select: { id: true, githubLogin: true },
    });

    return { user, sessionCookie: this.createSessionCookie(user.id) };
  }

  getUserIdFromCookie(cookieHeader?: string): string | null {
    const token = readCookie(cookieHeader, SESSION_COOKIE);
    if (!token) return null;

    const separator = token.lastIndexOf('.');
    if (separator < 1) return null;
    const encodedPayload = token.slice(0, separator);
    const receivedSignature = token.slice(separator + 1);
    const expectedSignature = this.sign(encodedPayload);
    if (!safeStringEqual(receivedSignature, expectedSignature)) return null;

    try {
      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SessionPayload;
      if (payload.expiresAt <= Date.now() || typeof payload.userId !== 'string') return null;
      return payload.userId;
    } catch {
      return null;
    }
  }

  createSessionCookie(userId: string): string {
    const payload: SessionPayload = {
      userId,
      expiresAt: Date.now() + SESSION_LIFETIME_SECONDS * 1000,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const token = `${encodedPayload}.${this.sign(encodedPayload)}`;
    return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_LIFETIME_SECONDS}${this.secureCookieFlag()}`;
  }

  clearSessionCookie(): string {
    return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${this.secureCookieFlag()}`;
  }

  createStateCookie(state: string): string {
    return `${STATE_COOKIE}=${state}; HttpOnly; SameSite=Lax; Path=/api/auth/github/callback; Max-Age=600${this.secureCookieFlag()}`;
  }

  clearStateCookie(): string {
    return `${STATE_COOKIE}=; HttpOnly; SameSite=Lax; Path=/api/auth/github/callback; Max-Age=0${this.secureCookieFlag()}`;
  }

  getStateCookie(cookieHeader?: string) {
    return readCookie(cookieHeader, STATE_COOKIE);
  }

  getFrontendUrl() {
    return this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  private getCallbackUrl() {
    const callbackUrl = this.config.get<string>('GITHUB_CALLBACK_URL');
    if (!callbackUrl) {
      throw new InternalServerErrorException('GITHUB_CALLBACK_URL doit être configurée.');
    }
    return callbackUrl;
  }

  private sign(value: string) {
    const secret = this.config.get<string>('APP_SESSION_SECRET');
    if (!secret || secret.length < 32) {
      throw new InternalServerErrorException('APP_SESSION_SECRET doit avoir au moins 32 caractères.');
    }
    return createHmac('sha256', secret).update(value).digest('base64url');
  }

  private secureCookieFlag() {
    return this.config.get<string>('NODE_ENV') === 'production' ? '; Secure' : '';
  }
}

function isGitHubProfile(value: unknown): value is GitHubProfile {
  const profile = asObject(value);
  return typeof profile.id === 'number' && typeof profile.login === 'string';
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readCookie(cookieHeader: string | undefined, cookieName: string): string | null {
  const cookie = cookieHeader?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));
  return cookie ? decodeURIComponent(cookie.slice(cookieName.length + 1)) : null;
}

function safeStringEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}
