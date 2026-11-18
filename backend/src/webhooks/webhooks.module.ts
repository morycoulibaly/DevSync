import { Module } from '@nestjs/common';
import { GitHubWebhookController } from './github-webhook.controller';
import { GitHubWebhookService } from './github-webhook.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [GitHubWebhookController],
  providers: [GitHubWebhookService],
})
export class WebhooksModule {}
