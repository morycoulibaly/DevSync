import { IsBoolean } from 'class-validator';

export class UpdateNotificationChannelDto {
  @IsBoolean()
  enabled!: boolean;
}
