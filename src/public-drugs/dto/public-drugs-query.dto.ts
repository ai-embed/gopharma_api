import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min
} from 'class-validator';

export type PublicDrugsSort = 'NAME_ASC' | 'NAME_DESC';

export class PublicDrugsQueryDto {
  @ApiPropertyOptional({ example: 'Paracetamol' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({ example: 'Comprimé' })
  @IsOptional()
  @IsString()
  form?: string;

  @ApiPropertyOptional({ enum: ['NAME_ASC', 'NAME_DESC'], default: 'NAME_ASC' })
  @IsOptional()
  @IsIn(['NAME_ASC', 'NAME_DESC'])
  sort?: PublicDrugsSort = 'NAME_ASC';
}
