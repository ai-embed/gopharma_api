import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { FavoriteTargetType } from 'src/common/enums/domain.enums';

export class CreateFavoriteDto {
  @ApiProperty({ enum: FavoriteTargetType })
  @IsEnum(FavoriteTargetType)
  targetType!: FavoriteTargetType;

  @ApiPropertyOptional({ example: '65f0d2d7c9a1b33d7d9b1234' })
  @IsOptional()
  @IsString()
  pharmacyId?: string;

  @ApiPropertyOptional({ example: '65f0d2d7c9a1b33d7d9b5678' })
  @IsOptional()
  @IsString()
  productId?: string;
}
