import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class SearchPharmaciesDto {
  private static parseBoolean(value: unknown) {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
    return value;
  }

  @ApiPropertyOptional({ example: 'Pharmacie' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: '123 Rue de la Santé, Cotonou' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 6.3654 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 2.4183 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radiusKm?: number;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minDistanceKm?: number;

  @ApiPropertyOptional({ example: 50, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxDistanceKm?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => SearchPharmaciesDto.parseBoolean(value))
  @IsBoolean()
  openNow?: boolean | string;
}
