import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreateManagerCategoryDto {
  @ApiProperty({ example: 'Antalgiques' })
  @IsString()
  @Length(1, 120)
  name!: string;
}

export class UpdateManagerCategoryDto {
  @ApiProperty({ example: 'Analgésiques' })
  @IsString()
  @Length(1, 120)
  name!: string;
}

export class DeleteManagerCategoryDto {
  @ApiPropertyOptional({ example: 'Divers' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  replaceWith?: string;
}
