import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { GitHubSessionGuard } from '../auth/github-session.guard';
import { DependenciesService } from './dependencies.service';
import { ScanDependenciesDto } from './dependencies.dto';
import { ScanRepositoryDependenciesDto } from './scan-repository-dependencies.dto';
import { DependencyScanQueueService } from './dependency-scan-queue.service';

interface AuthenticatedRequest extends Request {
  devsyncUser: { id: string };
}

@Controller('dependencies')
@UseGuards(GitHubSessionGuard)
export class DependenciesController {
  constructor(
    private readonly dependenciesService: DependenciesService,
    private readonly scanQueue: DependencyScanQueueService,
  ) {}

  @Post('scans')
  @HttpCode(HttpStatus.ACCEPTED)
  scan(@Req() request: AuthenticatedRequest, @Body() body: ScanDependenciesDto) {
    return this.scanQueue.enqueuePastedScan(
      request.devsyncUser.id,
      body.packageJson,
      body.packageLock,
    );
  }

  @Post('repository-scans')
  @HttpCode(HttpStatus.ACCEPTED)
  scanRepository(
    @Req() request: AuthenticatedRequest,
    @Body() body: ScanRepositoryDependenciesDto,
  ) {
    return this.scanQueue.enqueueRepositoryScan(
      request.devsyncUser.id,
      body.repositoryId,
      body.packageJsonPath,
      body.packageLockPath,
    );
  }

  @Get('scans/jobs/:jobId')
  getScanJobStatus(@Req() request: AuthenticatedRequest, @Param('jobId') jobId: string) {
    return this.scanQueue.getJobStatus(request.devsyncUser.id, jobId);
  }

  @Get('scans')
  listScans(@Req() request: AuthenticatedRequest) {
    return this.dependenciesService.listForUser(request.devsyncUser.id);
  }
}
