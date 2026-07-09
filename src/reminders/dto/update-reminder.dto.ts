import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateIf
} from 'class-validator';
import { ReminderFrequency } from 'src/common/enums/domain.enums';

export class UpdateReminderDto {
  @ApiPropertyOptional({ example: 'Paracetamol 500mg' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  medicationName?: string;

  @ApiPropertyOptional({ example: 'Prendre après le repas' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  note?: string;

  @ApiPropertyOptional({ enum: ReminderFrequency })
  @IsOptional()
  @IsEnum(ReminderFrequency)
  frequency?: ReminderFrequency;

  @ApiPropertyOptional({ example: 8 })
  @ValidateIf((value) => value.frequency === ReminderFrequency.CUSTOM)
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  intervalHours?: number;

  @ApiPropertyOptional({ example: '2026-03-11T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-04-11T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
