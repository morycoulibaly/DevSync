import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DigestQueueService } from './digest-queue.service';
import { DigestsController } from './digests.controller';
import { DigestsService } from './digests.service';

@Module({
  imports: [AuthModule],
  controllers: [DigestsController],
  providers: [DigestsService, DigestQueueService],
})
export class DigestsModule {}
