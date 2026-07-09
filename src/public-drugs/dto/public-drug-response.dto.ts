import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicDrugResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  scientificName?: string;

  @ApiPropertyOptional()
  category?: string;

  @ApiPropertyOptional()
  barcode?: string;

  @ApiPropertyOptional()
  form?: string;

  @ApiPropertyOptional()
  strength?: string;

  @ApiPropertyOptional()
  laboratory?: string;

  @ApiPropertyOptional()
  atcCode?: string;

  @ApiPropertyOptional()
  country?: string;

  @ApiPropertyOptional()
  source?: string;

  @ApiPropertyOptional()
  sourcePharmacyId?: string;

  @ApiPropertyOptional()
  sourcePharmacyName?: string;
}
