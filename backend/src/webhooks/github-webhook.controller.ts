import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { GitHubWebhookService } from './github-webhook.service';

@Controller('webhooks/github')
export class GitHubWebhookController {
  constructor(private readonly webhookService: GitHubWebhookService) {}

  @Post(':webhookToken')
  @HttpCode(HttpStatus.ACCEPTED)
  receiveWebhook(
    @Param('webhookToken') webhookToken: string,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Headers('x-github-delivery') deliveryId: string | undefined,
    @Headers('x-github-event') eventName: string | undefined,
    @Req() request: RawBodyRequest<Request>,
  ) {
    return this.webhookService.process({
      webhookToken,
      signature,
      deliveryId,
      eventName,
      rawBody: request.rawBody,
    });
  }
}
