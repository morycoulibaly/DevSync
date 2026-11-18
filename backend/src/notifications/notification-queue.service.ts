import { Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { NotificationsService } from './notifications.service';

const QUEUE_NAME = 'github-notifications';
interface NotificationJobData { eventId: string; channelId: string }

@Injectable()
export class NotificationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueueService.name);
  private readonly queueConnection: IORedis;
  private readonly workerConnection: IORedis;
  private readonly queue: Queue<NotificationJobData>;
  private worker!: Worker<NotificationJobData>;

  constructor(config: ConfigService, private readonly notifications: NotificationsService) {
    const host = config.get<string>('REDIS_HOST', 'localhost');
    const port = config.get<number>('REDIS_PORT', 6379);
    this.queueConnection = new IORedis({ host, port, maxRetriesPerRequest: 1, enableOfflineQueue: false });
    this.workerConnection = new IORedis({ host, port, maxRetriesPerRequest: null });
    this.queue = new Queue(QUEUE_NAME, { connection: this.queueConnection });
    this.queue.on('error', () => this.logger.error('La file des notifications ne peut pas joindre Redis.'));
    this.queueConnection.on('error', () => this.logger.error('Redis est indisponible pour ajouter une notification.'));
    this.workerConnection.on('error', () => this.logger.error('Redis est indisponible pour traiter les notifications.'));
  }

  onModuleInit() {
    this.worker = new Worker<NotificationJobData>(
      QUEUE_NAME,
      (job) => this.processJob(job),
      { connection: this.workerConnection, concurrency: 5 },
    );
    this.worker.on('failed', (job) => {
      if (job) this.logger.warn(`La notification ${job.id} a échoué après ses tentatives.`);
    });
    this.worker.on('error', () => this.logger.error('Le worker de notifications a rencontré une erreur Redis.'));
  }

  async enqueueEvent(eventId: string) {
    try {
      const channelIds = await this.notifications.getEnabledChannelIdsForEvent(eventId);
      await Promise.all(channelIds.map((channelId) => this.queue.add(
        'notify-github-event',
        { eventId, channelId },
        {
          jobId: `event-${eventId}-channel-${channelId}`,
          attempts: 5,
          backoff: { type: 'exponential', delay: 2_000 },
          removeOnComplete: { age: 3600, count: 500 },
          removeOnFail: { age: 86400, count: 1000 },
        },
      )));
    } catch {
      throw new ServiceUnavailableException('La file de notifications est indisponible. Vérifie que Redis est démarré.');
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue.close();
    await Promise.all([this.queueConnection.quit(), this.workerConnection.quit()]);
  }

  private async processJob(job: Job<NotificationJobData>) {
    await this.notifications.notifyForEvent(job.data.eventId, job.data.channelId);
  }
}
