import { IsUrl, MaxLength } from 'class-validator';

export class CreateNotificationChannelDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  target!: string;
}
