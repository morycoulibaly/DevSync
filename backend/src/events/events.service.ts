import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ListEventsDto } from './list-events.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, filters: ListEventsDto) {
    const where = {
      // La relation garantit qu'un utilisateur ne peut voir que ses propres dépôts.
      repository: {
        userId,
        ...(filters.repositoryId ? { id: filters.repositoryId } : {}),
      },
    };
    const skip = (filters.page - 1) * filters.limit;

    const [items, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        skip,
        take: filters.limit,
        // Le payload brut n'est pas nécessaire au fil d'activité.
        select: {
          id: true,
          repositoryId: true,
          type: true,
          action: true,
          status: true,
          actorLogin: true,
          actorAvatar: true,
          title: true,
          url: true,
          occurredAt: true,
          repository: { select: { fullName: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      items: items.map(({ repository, ...event }) => ({
        ...event,
        repositoryName: repository.fullName,
      })),
      total,
      page: filters.page,
      limit: filters.limit,
    };
  }
}
