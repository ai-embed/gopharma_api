import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountStatus } from 'src/common/enums/domain.enums';

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

  @ApiProperty()
  ifu!: string;

  @ApiPropertyOptional()
  email?: string;

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

  @ApiProperty({ enum: AccountStatus })
  accountStatus!: AccountStatus;

  @ApiProperty({ enum: ['OUVERT', 'FERME'] })
  operationalStatus!: 'OUVERT' | 'FERME';

  @ApiProperty()
  openNow!: boolean;

  @ApiProperty({ enum: ['manual', 'schedule'] })
  availabilitySource!: 'manual' | 'schedule';

  @ApiPropertyOptional()
  nextTransitionAt?: string;

  @ApiPropertyOptional()
  matchedRule?: string;

  @ApiPropertyOptional()
  validationDate?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
