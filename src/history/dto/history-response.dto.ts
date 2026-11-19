import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SearchType } from '../../common/enums/domain.enums';

export class HistoryMetadataDto {
  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  lat?: number;

  @ApiPropertyOptional()
  lng?: number;

  @ApiPropertyOptional()
  radiusKm?: number;

  @ApiPropertyOptional()
  openNow?: boolean;

  @ApiPropertyOptional()
  maxPrice?: number;

  @ApiPropertyOptional({ enum: SearchType })
  searchType?: SearchType;
}

export class HistoryResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  query!: string;

  @ApiProperty({ enum: SearchType })
  searchType!: SearchType;

  @ApiProperty()
  resultCount!: number;

  @ApiPropertyOptional({ type: HistoryMetadataDto })
  metadata?: HistoryMetadataDto;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
