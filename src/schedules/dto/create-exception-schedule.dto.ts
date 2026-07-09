import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateExceptionScheduleDto {
  @ApiProperty({ example: '2026-12-25' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-12-25' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isClosed!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  onDuty!: boolean;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  openTime?: string;

  @ApiPropertyOptional({ example: '14:00' })
  @IsOptional()
  @IsString()
  closeTime?: string;

  @ApiPropertyOptional({ example: 'Jour férié' })
  @IsOptional()
  @IsString()
  label?: string;
}
