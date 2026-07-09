import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountStatus, StockMovementType } from 'src/common/enums/domain.enums';

class ManagerPharmacyLocationResponseDto {
  @ApiProperty({ enum: ['Point'] })
  type!: 'Point';

  @ApiProperty({ type: [Number], example: [2.4183, 6.3654] })
  coordinates!: [number, number];
}

export class ManagerPharmacyResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  address!: string;

  @ApiProperty({ type: ManagerPharmacyLocationResponseDto })
  location!: ManagerPharmacyLocationResponseDto;

  @ApiProperty()
  ifu!: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  photoUrl?: string;

  @ApiPropertyOptional()
  bannerUrl?: string;

  @ApiProperty()
  ownerId!: string;

  @ApiProperty({ enum: AccountStatus })
  accountStatus!: AccountStatus;

  @ApiProperty({ enum: ['OUVERT', 'FERME'] })
  operationalStatus!: 'OUVERT' | 'FERME';

  @ApiPropertyOptional()
  validationDate?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

class ProductResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  scientificName?: string;

  @ApiPropertyOptional()
  barcode?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  noticeUrl?: string;

  @ApiProperty()
  isMedicine!: boolean;

  @ApiPropertyOptional()
  category?: string;

  @ApiPropertyOptional()
  imageFileId?: string;
}

export class ManagerInventoryItemResponseDto {
  @ApiProperty()
  inventoryId!: string;

  @ApiProperty({ type: ProductResponseDto })
  product!: ProductResponseDto;

  @ApiProperty()
  price!: number;

  @ApiProperty()
  stockQuantity!: number;

  @ApiProperty()
  alertThreshold!: number;

  @ApiProperty()
  isAvailable!: boolean;

  @ApiPropertyOptional()
  expiryDate?: string;

  @ApiProperty()
  lastUpdatedAt!: string;
}

export class InventoryResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  pharmacyId!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty({ example: 1500 })
  price!: number;

  @ApiProperty({ example: 12 })
  stockQuantity!: number;

  @ApiProperty({ example: 5 })
  alertThreshold!: number;

  @ApiProperty()
  isAvailable!: boolean;

  @ApiPropertyOptional()
  expiryDate?: string;

  @ApiProperty()
  lastUpdatedAt!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class ManagerProductMutationResponseDto {
  @ApiProperty({ type: InventoryResponseDto })
  inventory!: InventoryResponseDto;

  @ApiProperty({ type: ProductResponseDto })
  product!: ProductResponseDto;
}

export class StockUpdateResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  pharmacyId!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty({ example: 50, description: 'Updated stock quantity' })
  stockQuantity!: number;

  @ApiProperty({ example: 10 })
  alertThreshold!: number;

  @ApiProperty()
  isAvailable!: boolean;

  @ApiProperty()
  lastUpdatedAt!: string;
}

export class PriceUpdateResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  pharmacyId!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty({ example: 2000, description: 'Updated price' })
  price!: number;

  @ApiProperty()
  isAvailable!: boolean;

  @ApiProperty()
  lastUpdatedAt!: string;
}

export class StockMovementResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  inventoryItemId!: string;

  @ApiProperty()
  pharmacyId!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty({ enum: StockMovementType })
  type!: StockMovementType;

  @ApiProperty()
  quantityDelta!: number;

  @ApiPropertyOptional()
  previousPrice?: number;

  @ApiPropertyOptional()
  nextPrice?: number;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  actorUserId?: string;

  @ApiProperty()
  date!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class VisitStatsResponseDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  last7Days!: number;

  @ApiProperty()
  last30Days!: number;
}

class WeeklySlotResponseDto {
  @ApiProperty()
  dayOfWeek!: number;

  @ApiPropertyOptional()
  openTime?: string;

  @ApiPropertyOptional()
  closeTime?: string;

  @ApiProperty()
  isClosed!: boolean;

  @ApiProperty()
  onDuty!: boolean;
}

class ExceptionSlotResponseDto {
  @ApiProperty()
  startDate!: string;

  @ApiProperty()
  endDate!: string;

  @ApiProperty()
  isClosed!: boolean;

  @ApiProperty()
  onDuty!: boolean;

  @ApiPropertyOptional()
  openTime?: string;

  @ApiPropertyOptional()
  closeTime?: string;

  @ApiPropertyOptional()
  label?: string;
}

export class ManagerScheduleResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  pharmacyId!: string;

  @ApiProperty({ type: [WeeklySlotResponseDto] })
  weekly!: WeeklySlotResponseDto[];

  @ApiProperty({ type: [ExceptionSlotResponseDto] })
  exceptions!: ExceptionSlotResponseDto[];

  @ApiPropertyOptional()
  updatedBy?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
