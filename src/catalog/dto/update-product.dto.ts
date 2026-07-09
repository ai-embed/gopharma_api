import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Paracetamol 1000mg' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Paracetamol' })
  @IsOptional()
  @IsString()
  scientificName?: string;

  @ApiPropertyOptional({ example: 'Comprimé' })
  @IsOptional()
  @IsString()
  form?: string;

  @ApiPropertyOptional({ example: '500 mg' })
  @IsOptional()
  @IsString()
  strength?: string;

  @ApiPropertyOptional({ example: 'Sanofi' })
  @IsOptional()
  @IsString()
  laboratory?: string;

  @ApiPropertyOptional({ example: 'N02BE01' })
  @IsOptional()
  @IsString()
  atcCode?: string;

  @ApiPropertyOptional({ example: 'BJ' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Catalogue pharmacies' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ example: '3400930000000' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ example: 'Nouvelle description produit' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/notices/paracetamol.pdf' })
  @IsOptional()
  @IsString()
  noticeUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isMedicine?: boolean;

  @ApiPropertyOptional({ example: 'Antalgique' })
  @IsOptional()
  @IsString()
  category?: string;
}
