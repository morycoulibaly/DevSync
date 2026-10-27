import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { GitHubSessionGuard } from '../auth/github-session.guard';
import { CreateRepositoryDto } from './create-repository.dto';
import { RepositoriesService } from './repositories.service';

interface AuthenticatedRequest extends Request {
  devsyncUser: { id: string };
}

@Controller('repositories')
@UseGuards(GitHubSessionGuard)
export class RepositoriesController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.repositoriesService.listForUser(request.devsyncUser.id);
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() details: CreateRepositoryDto,
  ) {
    return this.repositoriesService.createForUser(request.devsyncUser.id, details);
  }

  @Post(':repositoryId/webhook-secret/rotate')
  rotateWebhookSecret(
    @Req() request: AuthenticatedRequest,
    @Param('repositoryId') repositoryId: string,
  ) {
    return this.repositoriesService.rotateWebhookSecret(request.devsyncUser.id, repositoryId);
  }
}
