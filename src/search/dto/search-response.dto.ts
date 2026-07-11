import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PublicPharmacyResponseDto } from '../../pharmacies/dto/public-pharmacy-response.dto';

class SearchProductInfoResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  scientificName?: string;

  @ApiPropertyOptional()
  barcode?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  noticeUrl?: string;

  @ApiProperty()
  isMedicine!: boolean;

  @ApiPropertyOptional()
  category?: string;
}

export class SearchProductResultResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty({ type: SearchProductInfoResponseDto })
  productId!: SearchProductInfoResponseDto;

  @ApiProperty({ type: PublicPharmacyResponseDto })
  pharmacyId!: PublicPharmacyResponseDto;

  @ApiProperty()
  price!: number;

  @ApiProperty()
  stockQuantity!: number;

  @ApiProperty()
  alertThreshold!: number;

  @ApiProperty()
  isAvailable!: boolean;

  @ApiPropertyOptional()
  expiryDate?: string;

  @ApiProperty()
  lastUpdatedAt!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
