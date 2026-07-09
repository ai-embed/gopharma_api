import {
  ApiProperty,
  ApiPropertyOptional
} from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Matches
} from 'class-validator';

export class RegisterPharmacyDto {
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

  @ApiPropertyOptional({ description: 'Latitude (optional if address geocoding enabled)' })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude (optional if address geocoding enabled)' })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentFileIds?: string[];
}
