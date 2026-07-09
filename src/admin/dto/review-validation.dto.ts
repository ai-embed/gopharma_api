import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ReviewValidationDto {
  @ApiPropertyOptional({ example: 'Documents vérifiés.' })
  @IsOptional()
  @IsString()
  comment?: string;
}
