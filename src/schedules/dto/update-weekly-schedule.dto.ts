import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

class WeeklySlotDto {
  @ApiProperty({ example: 1, minimum: 0, maximum: 6 })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  openTime?: string;

  @ApiPropertyOptional({ example: '20:00' })
  @IsOptional()
  @IsString()
  closeTime?: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isClosed!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  onDuty!: boolean;
}

export class UpdateWeeklyScheduleDto {
  @ApiProperty({ type: [WeeklySlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklySlotDto)
  weekly!: WeeklySlotDto[];
}
