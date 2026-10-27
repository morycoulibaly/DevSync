import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../database/prisma.service';
import { GitHubAuthService } from './github-auth.service';

interface AuthenticatedRequest extends Request {
  devsyncUser: { id: string; githubLogin: string };
}

@Injectable()
export class GitHubSessionGuard implements CanActivate {
  constructor(
    private readonly authService: GitHubAuthService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = this.authService.getUserIdFromCookie(request.headers.cookie);
    if (!userId) throw new UnauthorizedException('Connecte-toi avec GitHub pour continuer.');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, githubLogin: true },
    });
    if (!user) throw new UnauthorizedException('Session invalide.');

    request.devsyncUser = user;
    return true;
  }
}
