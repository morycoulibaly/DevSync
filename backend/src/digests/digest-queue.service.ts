import { Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaService } from '../database/prisma.service';
import { DigestsService } from './digests.service';

const QUEUE_NAME = 'daily-digests';

type DigestJobData =
  | { kind: 'repository-digest'; userId: string; repositoryId: string; date: string; refresh: boolean }
  | { kind: 'dispatch-daily-digests' };

export interface DigestJobResult {
  digestIds: string[];
}

export interface DigestJobAccepted {
  id: string;
}

@Injectable()
export class DigestQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DigestQueueService.name);
  private readonly queueConnection: IORedis;
  private readonly workerConnection: IORedis;
  private readonly queue: Queue<DigestJobData, DigestJobResult, string>;
  private worker!: Worker<DigestJobData, DigestJobResult, string>;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly digests: DigestsService,
  ) {
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = this.config.get<number>('REDIS_PORT', 6379);
    this.queueConnection = new IORedis({ host, port, maxRetriesPerRequest: 1, enableOfflineQueue: false });
    this.workerConnection = new IORedis({ host, port, maxRetriesPerRequest: null });
    this.queue = new Queue<DigestJobData, DigestJobResult, string>(QUEUE_NAME, {
      connection: this.queueConnection,
    });
    this.queue.on('error', () => this.logger.error('La file Daily Digest ne peut pas joindre Redis.'));
    this.queueConnection.on('error', () => this.logger.error('Redis est indisponible pour ajouter un Daily Digest.'));
    this.workerConnection.on('error', () => this.logger.error('Redis est indisponible pour traiter les Daily Digests.'));
  }

  async onModuleInit() {
    this.worker = new Worker<DigestJobData, DigestJobResult, string>(
      QUEUE_NAME,
      (job) => this.processJob(job),
      { connection: this.workerConnection, concurrency: 2 },
    );
    this.worker.on('failed', (job) => {
      if (job) this.logger.warn(`Le job Daily Digest ${job.id} a échoué.`);
    });
    this.worker.on('error', () => this.logger.error('Le worker Daily Digest a rencontré une erreur Redis.'));

    // Le planificateur ne crée rien tant qu’aucune clé Gemini n’est configurée.
    if (this.config.get<string>('GEMINI_API_KEY')) {
      try {
        await this.queue.upsertJobScheduler(
          'daily-digest-dispatcher',
          { pattern: '0 0 * * *' },
          { name: 'dispatch-daily-digests', data: { kind: 'dispatch-daily-digests' } },
        );
      } catch {
        this.logger.error('Impossible de planifier le Daily Digest quotidien dans Redis.');
      }
    }
  }

  async enqueueRepositoryDigest(
    userId: string,
    repositoryId: string,
    date: string,
    refresh = false,
  ): Promise<DigestJobAccepted> {
    await this.digests.validateRepositoryAccess(userId, repositoryId);
    this.digests.validateRequestedDate(date);
    const jobId = `digest-${repositoryId}-${date}`;
    try {
      const existingJob = await this.queue.getJob(jobId);
      if (existingJob) {
        const state = await existingJob.getState();
        if (state !== 'failed' && state !== 'completed') return { id: jobId };
        await existingJob.remove();
      }
      await this.queue.add('generate-repository-digest', {
        kind: 'repository-digest',
        userId,
        repositoryId,
        date,
        refresh,
      }, {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2_000 },
        removeOnComplete: { age: 3600, count: 100 },
        removeOnFail: { age: 86400, count: 500 },
      });
      return { id: jobId };
    } catch (error) {
      if (error instanceof ServiceUnavailableException || error instanceof NotFoundException) throw error;
      throw new ServiceUnavailableException('La file Daily Digest est indisponible. Vérifie que Redis est démarré, puis réessaie.');
    }
  }

  async getJobStatus(userId: string, jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) throw new NotFoundException('Génération de résumé introuvable.');
    if (job.data.kind === 'repository-digest' && job.data.userId !== userId) {
      throw new NotFoundException('Génération de résumé introuvable.');
    }
    if (job.data.kind === 'dispatch-daily-digests') {
      throw new NotFoundException('Génération de résumé introuvable.');
    }
    return {
      id: String(job.id),
      state: await job.getState(),
      result: job.returnvalue ?? null,
      error: job.failedReason ?? null,
    };
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue.close();
    await Promise.all([this.queueConnection.quit(), this.workerConnection.quit()]);
  }

  private async processJob(job: Job<DigestJobData, DigestJobResult, string>): Promise<DigestJobResult> {
    if (job.data.kind === 'dispatch-daily-digests') {
      const repositories = await this.prisma.repository.findMany({
        where: { isActive: true },
        select: { id: true, userId: true },
      });
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const date = yesterday.toISOString().slice(0, 10);
      for (const repository of repositories) {
        await this.enqueueRepositoryDigest(repository.userId, repository.id, date);
      }
      return { digestIds: [] };
    }

    const digest = await this.digests.generateForRepository(
      job.data.userId,
      job.data.repositoryId,
      job.data.date,
      job.data.refresh,
    );
    return { digestIds: [digest.id] };
  }
}
