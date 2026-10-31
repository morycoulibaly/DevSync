import { Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { DependenciesService } from './dependencies.service';

const QUEUE_NAME = 'dependency-scans';

type ScanJobData =
  | {
      userId: string;
      kind: 'pasted';
      packageJson: Record<string, unknown>;
      packageLock?: Record<string, unknown>;
    }
  | {
      userId: string;
      kind: 'repository';
      repositoryId: string;
      packageJsonPath: string;
      packageLockPath?: string;
    };

type ScanResult = Awaited<ReturnType<DependenciesService['scanPackageJson']>>;

export interface ScanJobResult {
  id: string;
}

@Injectable()
export class DependencyScanQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DependencyScanQueueService.name);
  private readonly queueConnection: IORedis;
  private readonly workerConnection: IORedis;
  private readonly queue: Queue<ScanJobData, ScanResult, string>;
  private worker!: Worker<ScanJobData, ScanResult, string>;

  constructor(
    private readonly config: ConfigService,
    private readonly dependencies: DependenciesService,
  ) {
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = this.config.get<number>('REDIS_PORT', 6379);
    this.queueConnection = new IORedis({ host, port, maxRetriesPerRequest: 1, enableOfflineQueue: false });
    this.workerConnection = new IORedis({ host, port, maxRetriesPerRequest: null });
    this.queue = new Queue<ScanJobData, ScanResult, string>(QUEUE_NAME, {
      connection: this.queueConnection,
    });
    this.queue.on('error', () => this.logger.error('Erreur de connexion à Redis pour la file des scans.'));
    this.queueConnection.on('error', () => this.logger.error('Redis est indisponible pour ajouter un scan.'));
    this.workerConnection.on('error', () => this.logger.error('Redis est indisponible pour traiter les scans.'));
  }

  onModuleInit() {
    this.worker = new Worker<ScanJobData, ScanResult, string>(
      QUEUE_NAME,
      async (job) => this.processJob(job),
      { connection: this.workerConnection, concurrency: 2 },
    );
    this.worker.on('failed', (job) => {
      if (job) this.logger.warn(`Le scan en arrière-plan ${job.id} a échoué.`);
    });
    this.worker.on('error', () => this.logger.error('Le worker des scans a rencontré une erreur Redis.'));
  }

  async enqueuePastedScan(
    userId: string,
    packageJson: Record<string, unknown>,
    packageLock?: Record<string, unknown>,
  ): Promise<ScanJobResult> {
    try {
      const job = await this.queue.add('scan-pasted-package', {
        userId,
        kind: 'pasted',
        packageJson,
        ...(packageLock ? { packageLock } : {}),
      }, { removeOnComplete: { age: 3600, count: 100 }, removeOnFail: { age: 86400, count: 500 } });
      return { id: String(job.id) };
    } catch {
      throw new ServiceUnavailableException('La file des analyses est indisponible. Vérifie que Redis est démarré, puis réessaie.');
    }
  }

  async enqueueRepositoryScan(
    userId: string,
    repositoryId: string,
    packageJsonPath = 'package.json',
    packageLockPath?: string,
  ): Promise<ScanJobResult> {
    await this.dependencies.validateRepositoryAccess(userId, repositoryId);
    try {
      const job = await this.queue.add('scan-repository-package', {
        userId,
        kind: 'repository',
        repositoryId,
        packageJsonPath,
        ...(packageLockPath ? { packageLockPath } : {}),
      }, { removeOnComplete: { age: 3600, count: 100 }, removeOnFail: { age: 86400, count: 500 } });
      return { id: String(job.id) };
    } catch {
      throw new ServiceUnavailableException('La file des analyses est indisponible. Vérifie que Redis est démarré, puis réessaie.');
    }
  }

  async getJobStatus(userId: string, jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job || job.data.userId !== userId) throw new NotFoundException('Analyse introuvable.');

    const state = await job.getState();
    return {
      id: String(job.id),
      state,
      progress: typeof job.progress === 'number' ? job.progress : 0,
      result: state === 'completed' ? job.returnvalue : null,
      error: state === 'failed' ? job.failedReason : null,
    };
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue.close();
    await Promise.all([this.queueConnection.quit(), this.workerConnection.quit()]);
  }

  private async processJob(job: Job<ScanJobData, ScanResult, string>): Promise<ScanResult> {
    await job.updateProgress(10);
    const scan = job.data.kind === 'pasted'
      ? await this.dependencies.scanPackageJson(job.data.userId, job.data.packageJson, job.data.packageLock)
      : await this.dependencies.scanRepositoryPackageJson(
          job.data.userId,
          job.data.repositoryId,
          job.data.packageJsonPath,
          job.data.packageLockPath,
        );
    await job.updateProgress(100);
    return scan;
  }
}
