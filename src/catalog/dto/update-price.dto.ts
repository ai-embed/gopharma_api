import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePriceDto {
  @ApiProperty({ example: 1600 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 'Ajustement tarifaire' })
  @IsOptional()
  @IsString()
  description?: string;
}
