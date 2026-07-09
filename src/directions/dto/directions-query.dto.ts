import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum TravelMode {
  DRIVING = 'driving',
  WALKING = 'walking',
  BICYCLING = 'bicycling',
  TRANSIT = 'transit'
}

export class DirectionsQueryDto {
  @ApiPropertyOptional({ example: 'Cotonou, Benin' })
  @IsOptional()
  @IsString()
  originAddress?: string;

  @ApiPropertyOptional({ example: 6.3654 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  originLat?: number;

  @ApiPropertyOptional({ example: 2.4183 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  originLng?: number;

  @ApiPropertyOptional({ example: 'Porto-Novo, Benin' })
  @IsOptional()
  @IsString()
  destinationAddress?: string;

  @ApiPropertyOptional({ example: 6.4969 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  destinationLat?: number;

  @ApiPropertyOptional({ example: 2.6288 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  destinationLng?: number;

  @ApiPropertyOptional({
    enum: TravelMode,
    example: TravelMode.DRIVING,
    default: TravelMode.DRIVING
  })
  @IsOptional()
  @IsEnum(TravelMode)
  mode?: TravelMode = TravelMode.DRIVING;
}
