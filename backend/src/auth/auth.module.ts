import { Module } from '@nestjs/common';
import { GitHubAuthController } from './github-auth.controller';
import { GitHubAuthService } from './github-auth.service';
import { GitHubSessionGuard } from './github-session.guard';

@Module({
  controllers: [GitHubAuthController],
  providers: [GitHubAuthService, GitHubSessionGuard],
  // RepositoriesModule réutilise le garde et ses dépendances pour protéger
  // ses routes. Exporter le service garde le provider visible dans ce contexte.
  exports: [GitHubAuthService, GitHubSessionGuard],
})
export class AuthModule {}
