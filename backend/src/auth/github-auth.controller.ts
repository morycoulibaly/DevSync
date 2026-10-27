import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { GitHubAuthService } from './github-auth.service';
import { GitHubSessionGuard } from './github-session.guard';

@Controller('auth')
export class GitHubAuthController {
  constructor(private readonly authService: GitHubAuthService) {}

  @Get('github')
  startGitHubLogin(@Res() response: Response) {
    const authorization = this.authService.createAuthorizationUrl();
    response.setHeader('Set-Cookie', this.authService.createStateCookie(authorization.state));
    return response.redirect(authorization.url);
  }

  @Get('github/callback')
  async finishGitHubLogin(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    if (!code || !state) throw new UnauthorizedException('Code OAuth GitHub manquant.');

    const { sessionCookie } = await this.authService.completeLogin(
      code,
      state,
      this.authService.getStateCookie(request.headers.cookie),
    );
    response.setHeader('Set-Cookie', [
      this.authService.clearStateCookie(),
      sessionCookie,
    ]);
    return response.redirect(`${this.authService.getFrontendUrl()}/repositories`);
  }

  @Get('me')
  @UseGuards(GitHubSessionGuard)
  currentUser(@Req() request: Request & { devsyncUser: { id: string; githubLogin: string } }) {
    return request.devsyncUser;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res() response: Response) {
    response.setHeader('Set-Cookie', this.authService.clearSessionCookie());
    return response.status(204).send();
  }
}
