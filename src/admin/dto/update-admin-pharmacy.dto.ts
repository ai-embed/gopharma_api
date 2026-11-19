import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length
} from 'class-validator';
import { AccountStatus } from '../../common/enums/domain.enums';

export class UpdateAdminPharmacyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 200)
  pharmacyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(3, 300)
  pharmacyAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(5, 100)
  ifu?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsString({ each: true })
  services?: string[];

  @ApiPropertyOptional({ enum: AccountStatus })
  @IsOptional()
  @IsEnum(AccountStatus)
  accountStatus?: AccountStatus;

  @ApiPropertyOptional({ enum: ['OUVERT', 'FERME'] })
  @IsOptional()
  @IsEnum(['OUVERT', 'FERME'])
  operationalStatus?: 'OUVERT' | 'FERME';
}
