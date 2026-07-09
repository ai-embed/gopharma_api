import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FavoriteTargetType } from 'src/common/enums/domain.enums';

export class FavoriteResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: FavoriteTargetType })
  targetType!: FavoriteTargetType;

  @ApiPropertyOptional()
  pharmacyId?: string;

  @ApiPropertyOptional()
  productId?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
