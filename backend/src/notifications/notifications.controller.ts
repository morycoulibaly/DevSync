import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { GitHubSessionGuard } from '../auth/github-session.guard';
import { CreateNotificationChannelDto } from './create-notification-channel.dto';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationsService } from './notifications.service';
import { UpdateNotificationChannelDto } from './update-notification-channel.dto';

interface AuthenticatedRequest extends Request { devsyncUser: { id: string } }

@Controller('notifications/channels')
@UseGuards(GitHubSessionGuard)
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly queue: NotificationQueueService,
  ) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.notifications.listChannels(request.devsyncUser.id);
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: CreateNotificationChannelDto) {
    return this.notifications.createDiscordChannel(request.devsyncUser.id, body.target);
  }

  @Patch(':channelId')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('channelId') channelId: string,
    @Body() body: UpdateNotificationChannelDto,
  ) {
    return this.notifications.setChannelEnabled(request.devsyncUser.id, channelId, body.enabled);
  }

  @Delete(':channelId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() request: AuthenticatedRequest, @Param('channelId') channelId: string) {
    return this.notifications.deleteChannel(request.devsyncUser.id, channelId);
  }

  @Post(':channelId/test')
  sendTest(@Req() request: AuthenticatedRequest, @Param('channelId') channelId: string) {
    return this.notifications.sendTest(request.devsyncUser.id, channelId);
  }
}
