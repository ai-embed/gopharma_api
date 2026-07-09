import { ApiProperty } from '@nestjs/swagger';

export class ManagerCategoryResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  normalizedName!: string;

  @ApiProperty()
  productCount!: number;

  @ApiProperty()
  createdAt?: Date;

  @ApiProperty()
  updatedAt?: Date;
}
