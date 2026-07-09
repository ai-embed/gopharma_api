import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsLatitude, IsLongitude, IsOptional, IsString, Length } from 'class-validator';

export class UpdateManagerPharmacyDto {
  @ApiPropertyOptional({ example: 'Pharmacie du Centre' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @ApiPropertyOptional({ example: '123 Rue de la Santé, Cotonou' })
  @IsOptional()
  @IsString()
  @Length(3, 300)
  address?: string;

  @ApiPropertyOptional({ example: 6.3654 })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: 2.4183 })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ example: 'Pharmacie de quartier ouverte 7j/7' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'contact@pharmacie.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ type: [String], example: ['Drive', 'Vaccination', 'Livraison'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  services?: string[];
}
