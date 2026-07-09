import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReminderFrequency } from 'src/common/enums/domain.enums';

export class ReminderResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  medicationName!: string;

  @ApiPropertyOptional()
  note?: string;

  @ApiProperty({ enum: ReminderFrequency })
  frequency!: ReminderFrequency;

  @ApiProperty()
  intervalHours!: number;

  @ApiProperty()
  startDate!: string;

  @ApiPropertyOptional()
  endDate?: string;

  @ApiProperty()
  nextRunAt!: string;

  @ApiPropertyOptional()
  lastSentAt?: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
