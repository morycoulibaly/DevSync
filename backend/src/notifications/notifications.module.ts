import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationQueueService],
  exports: [NotificationQueueService],
})
export class NotificationsModule {}
