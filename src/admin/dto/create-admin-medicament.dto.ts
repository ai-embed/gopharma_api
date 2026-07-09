import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAdminMedicamentDto {
  @ApiProperty({ example: 'Paracétamol 500 mg comprimé' })
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name!: string;

  @ApiPropertyOptional({ example: 'Paracétamol' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  scientificName?: string;

  @ApiPropertyOptional({ example: 'Antalgique' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @ApiPropertyOptional({ example: '3400930000000' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string;

  @ApiPropertyOptional({ example: 'Comprimé' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  form?: string;

  @ApiPropertyOptional({ example: '500 mg' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  strength?: string;

  @ApiPropertyOptional({ example: 'Sanofi' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  laboratory?: string;

  @ApiPropertyOptional({ example: 'N02BE01' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  atcCode?: string;

  @ApiPropertyOptional({ example: 'BJ' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional({ example: 'GoPharma Admin' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;
}
