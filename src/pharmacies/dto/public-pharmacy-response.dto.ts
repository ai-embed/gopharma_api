import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountStatus } from '../../common/enums/domain.enums';

class PharmacyLocationResponseDto {
  @ApiProperty({ enum: ['Point'] })
  type!: 'Point';

  @ApiProperty({ type: [Number], example: [2.4183, 6.3654] })
  coordinates!: [number, number];
}

export class PublicPharmacyResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  address!: string;

  @ApiProperty({ type: PharmacyLocationResponseDto })
  location!: PharmacyLocationResponseDto;

  @ApiPropertyOptional()
  ifu?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  phoneNumber?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  services?: string[];

  @ApiProperty()
  isSeeded!: boolean;

  @ApiPropertyOptional()
  photoUrl?: string;

  @ApiPropertyOptional()
  bannerUrl?: string;

  @ApiPropertyOptional({ enum: AccountStatus })
  accountStatus?: AccountStatus;

  @ApiPropertyOptional({ enum: ['OUVERT', 'FERME'] })
  operationalStatus?: 'OUVERT' | 'FERME';

  @ApiPropertyOptional()
  openNow?: boolean;

  @ApiProperty({ enum: ['manual', 'schedule', 'unknown'] })
  availabilitySource!: 'manual' | 'schedule' | 'unknown';

  @ApiPropertyOptional()
  nextTransitionAt?: string;

  @ApiPropertyOptional()
  matchedRule?: string;

  @ApiPropertyOptional({ enum: ['registered', 'community'] })
  source?: 'registered' | 'community';

  @ApiPropertyOptional()
  isCommunityReported?: boolean;

  @ApiPropertyOptional()
  validationDate?: string;

  @ApiPropertyOptional()
  createdAt?: string;

  @ApiPropertyOptional()
  updatedAt?: string;
}
