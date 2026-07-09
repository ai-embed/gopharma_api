import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Paracetamol 500mg' })
  @IsString()
  name!: string;

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

  @ApiPropertyOptional({ example: 'Boîte de 20 comprimés' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/notices/paracetamol.pdf' })
  @IsOptional()
  @IsString()
  noticeUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isMedicine?: boolean = true;

  @ApiPropertyOptional({ example: 'Antalgique' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: 1500 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ example: 12 })
  @IsNumber()
  @Min(0)
  stockQuantity!: number;

  @ApiPropertyOptional({ example: 3, default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  alertThreshold?: number = 5;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  expiryDate?: Date;
}
