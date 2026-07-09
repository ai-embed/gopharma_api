import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateStockDto {
  @ApiProperty({ example: 4 })
  @IsNumber()
  stockQuantity!: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  alertThreshold?: number;

  @ApiPropertyOptional({ example: 'Réapprovisionnement manuel' })
  @IsOptional()
  @IsString()
  description?: string;
}
