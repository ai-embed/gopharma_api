import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Matches
} from 'class-validator';

export class CreateAdminPharmacyDto {
  @ApiProperty()
  @IsString()
  @Length(1, 100)
  managerFirstName!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 100)
  managerLastName!: string;

  @ApiProperty()
  @IsEmail()
  managerEmail!: string;

  @ApiProperty()
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/)
  password!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 100)
  country!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 200)
  pharmacyName!: string;

  @ApiProperty()
  @IsString()
  @Length(3, 300)
  pharmacyAddress!: string;

  @ApiProperty()
  @IsString()
  @Length(5, 100)
  ifu!: string;

  @ApiProperty()
  @IsLatitude()
  latitude!: number;

  @ApiProperty()
  @IsLongitude()
  longitude!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

