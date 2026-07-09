import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { SearchType } from 'src/common/enums/domain.enums';

export class CreateHistoryDto {
  @ApiProperty({ example: 'Amoxicilline 500mg' })
  @IsString()
  query!: string;

  @ApiProperty({ enum: SearchType })
  @IsEnum(SearchType)
  searchType!: SearchType;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  resultCount?: number;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
