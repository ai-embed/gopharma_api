import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountStatus, ValidationStatus } from 'src/common/enums/domain.enums';
import { PublicDrugResponseDto } from 'src/public-drugs/dto/public-drug-response.dto';
import { UserResponseDto } from 'src/users/dto/user-response.dto';

export class IntegrationStatusResponseDto {
  @ApiProperty({ enum: ['smtp', 'googleMaps'] })
  name!: 'smtp' | 'googleMaps';

  @ApiProperty()
  configured!: boolean;

  @ApiProperty()
  ok!: boolean;

  @ApiProperty({ enum: ['OK', 'ERROR', 'UNCONFIGURED'] })
  status!: 'OK' | 'ERROR' | 'UNCONFIGURED';

  @ApiProperty()
  details!: string;

  @ApiProperty()
  checkedAt!: string;
}

export class IntegrationStatusMapResponseDto {
  @ApiProperty({ type: IntegrationStatusResponseDto })
  smtp!: IntegrationStatusResponseDto;

  @ApiProperty({ type: IntegrationStatusResponseDto })
  googleMaps!: IntegrationStatusResponseDto;
}

export class PharmacyValidationResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  pharmacyId!: string;

  @ApiProperty()
  requestedByUserId!: string;

  @ApiPropertyOptional()
  reviewedByAdminId?: string;

  @ApiProperty({ enum: ValidationStatus })
  status!: ValidationStatus;

  @ApiPropertyOptional()
  comment?: string;

  @ApiProperty({ type: [String] })
  documents!: string[];

  @ApiPropertyOptional()
  reviewedAt?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AdminPharmacyResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  address!: string;

  @ApiProperty()
  ifu!: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  description?: string;

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

export class AdminValidationApprovalResponseDto {
  @ApiProperty({ type: PharmacyValidationResponseDto })
  validation!: PharmacyValidationResponseDto;

  @ApiProperty({ type: AdminPharmacyResponseDto })
  pharmacy!: AdminPharmacyResponseDto;
}

export class AdminValidationRejectionResponseDto {
  @ApiProperty({ type: PharmacyValidationResponseDto })
  validation!: PharmacyValidationResponseDto;
}

export class AdminCreateUserResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}

export class AdminCreatePharmacyResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: UserResponseDto })
  manager!: UserResponseDto;

  @ApiProperty({ type: AdminPharmacyResponseDto })
  pharmacy!: AdminPharmacyResponseDto;
}

export class AdminMedicamentsListResponseDto {
  @ApiProperty({ type: PublicDrugResponseDto, isArray: true })
  items!: PublicDrugResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  offset!: number;
}

export class AdminMedicamentsSyncResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  syncedCount!: number;
}

export class AdminProductsCleanupResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  deletedProducts!: number;

  @ApiProperty()
  deletedAdminMedicaments!: number;
}

export class AdminReportWeeklyBarDto {
  @ApiProperty()
  day!: string;

  @ApiProperty()
  count!: number;
}

export class AdminReportIncidentDto {
  @ApiProperty()
  label!: string;

  @ApiProperty({ enum: ['amber', 'rose', 'emerald'] })
  tone!: 'amber' | 'rose' | 'emerald';
}

export class AdminReportsOverviewResponseDto {
  @ApiProperty()
  reportTotal!: number;

  @ApiProperty()
  alertsTotal!: number;

  @ApiProperty()
  pharmaciesTotal!: number;

  @ApiProperty()
  errorEvents!: number;

  @ApiProperty()
  pendingValidations!: number;

  @ApiProperty({ type: AdminReportWeeklyBarDto, isArray: true })
  weeklyBars!: AdminReportWeeklyBarDto[];

  @ApiProperty({ type: AdminReportIncidentDto, isArray: true })
  incidents!: AdminReportIncidentDto[];
}

export class AdminGrowthSliceDto {
  @ApiProperty()
  label!: string;

  @ApiProperty()
  count!: number;

  @ApiProperty()
  percent!: number;
}

export class AdminGrowthCountryDto {
  @ApiProperty()
  country!: string;

  @ApiProperty()
  count!: number;

  @ApiProperty()
  percent!: number;
}

export class AdminGrowthOverviewResponseDto {
  @ApiProperty()
  usersGrowth!: number;

  @ApiProperty()
  usersCurrent!: number;

  @ApiProperty()
  pharmaciesGrowth!: number;

  @ApiProperty()
  pharmaciesCurrent!: number;

  @ApiProperty()
  searchesCount!: number;

  @ApiProperty({ type: AdminGrowthCountryDto, isArray: true })
  topCountries!: AdminGrowthCountryDto[];

  @ApiProperty({ type: AdminGrowthSliceDto, isArray: true })
  roleBreakdown!: AdminGrowthSliceDto[];
}
