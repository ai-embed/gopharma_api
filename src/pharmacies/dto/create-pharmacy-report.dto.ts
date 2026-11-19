import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Matches
} from 'class-validator';

export class CreatePharmacyReportDto {
  @ApiProperty({ example: 'Pharmacie du quartier' })
  @IsString()
  @Length(2, 150)
  name!: string;

  @ApiProperty({ example: 'Rue principale, Cotonou' })
  @IsString()
  @Length(3, 300)
  address!: string;

  @ApiPropertyOptional({ example: '+229 01 23 45 67 89' })
  @IsOptional()
  @IsString()
  @Length(5, 30)
  @Matches(/^[+0-9().\-\s]+$/)
  phoneNumber?: string;

  @ApiProperty({ example: 6.3654 })
  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: 2.4183 })
  @Type(() => Number)
  @IsLongitude()
  longitude!: number;
}
