import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AccountStatus,
  NotificationChannel,
  Role,
  SupportedLanguage,
  ThemePreference
} from 'src/common/enums/domain.enums';

export class UserPreferencesResponseDto {
  @ApiProperty({ enum: SupportedLanguage })
  language!: SupportedLanguage;

  @ApiProperty()
  timezone!: string;

  @ApiProperty({ enum: NotificationChannel, isArray: true })
  channels!: NotificationChannel[];

  @ApiProperty()
  alertsEnabled!: boolean;

  @ApiProperty({ enum: ThemePreference })
  theme!: ThemePreference;
}

export class UserResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  googleId?: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty({ enum: AccountStatus })
  accountStatus!: AccountStatus;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  country!: string;

  @ApiPropertyOptional()
  phoneNumber?: string;

  @ApiPropertyOptional()
  emailVerifiedAt?: string | null;

  @ApiProperty({ type: UserPreferencesResponseDto })
  preferences!: UserPreferencesResponseDto;

  @ApiPropertyOptional()
  profilePhotoUrl?: string;
}
