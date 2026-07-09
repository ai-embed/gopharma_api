import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class SuspendAccountDto {
  @ApiProperty({ example: 'Documents manquants' })
  @IsString()
  reason!: string;

  @ApiPropertyOptional({ example: '2026-04-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
