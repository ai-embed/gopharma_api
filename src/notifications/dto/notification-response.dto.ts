import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationChannel,
  NotificationType
} from '../../common/enums/domain.enums';

export class NotificationMetadataDto {
  @ApiPropertyOptional()
  productId?: string;

  @ApiPropertyOptional()
  pharmacyId?: string;

  @ApiPropertyOptional()
  reminderId?: string;

  @ApiPropertyOptional()
  medicationName?: string;
}

export class NotificationResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  sentAt!: string;

  @ApiProperty()
  isRead!: boolean;

  @ApiProperty({ enum: NotificationChannel, isArray: true })
  channels!: NotificationChannel[];

  @ApiPropertyOptional({ type: NotificationMetadataDto })
  metadata?: NotificationMetadataDto;
}
