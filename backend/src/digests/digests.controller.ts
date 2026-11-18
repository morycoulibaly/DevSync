import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { GitHubSessionGuard } from '../auth/github-session.guard';
import { DigestQueueService } from './digest-queue.service';
import { DigestsService } from './digests.service';
import { GenerateDigestDto } from './generate-digest.dto';

interface AuthenticatedRequest extends Request {
  devsyncUser: { id: string };
}

@Controller('digests')
@UseGuards(GitHubSessionGuard)
export class DigestsController {
  constructor(
    private readonly digests: DigestsService,
    private readonly queue: DigestQueueService,
  ) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.digests.listForUser(request.devsyncUser.id);
  }

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  generate(@Req() request: AuthenticatedRequest, @Body() body: GenerateDigestDto) {
    const date = body.date ?? yesterdayUtcDate();
    return this.queue.enqueueRepositoryDigest(request.devsyncUser.id, body.repositoryId, date, true);
  }

  @Get('jobs/:jobId')
  jobStatus(@Req() request: AuthenticatedRequest, @Param('jobId') jobId: string) {
    return this.queue.getJobStatus(request.devsyncUser.id, jobId);
  }
}

function yesterdayUtcDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
