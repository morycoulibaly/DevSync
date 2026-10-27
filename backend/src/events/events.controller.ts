import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { GitHubSessionGuard } from '../auth/github-session.guard';
import { EventsService } from './events.service';
import { ListEventsDto } from './list-events.dto';

interface AuthenticatedRequest extends Request {
  devsyncUser: { id: string };
}

@Controller('events')
@UseGuards(GitHubSessionGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest, @Query() filters: ListEventsDto) {
    return this.eventsService.listForUser(request.devsyncUser.id, filters);
  }
}
