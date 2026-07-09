import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountStatus } from 'src/common/enums/domain.enums';
import { UserResponseDto } from 'src/users/dto/user-response.dto';

export class TokenPairResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;
}

export class AuthSessionResponseDto extends TokenPairResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}

export class RegisterPatientResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;

  @ApiPropertyOptional()
  developmentToken?: string;
}

export class ForgotPasswordResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiPropertyOptional()
  developmentToken?: string;
}

export class SuccessResponseDto {
  @ApiProperty()
  success!: boolean;
}

export class PharmacyResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  address!: string;

  @ApiProperty()
  ifu!: string;

  @ApiProperty({ enum: AccountStatus })
  accountStatus!: AccountStatus;
}

export class RegisterPharmacyResponseDto {
  @ApiProperty({ type: UserResponseDto })
  manager!: UserResponseDto;

  @ApiProperty({ type: PharmacyResponseDto })
  pharmacy!: PharmacyResponseDto;

  @ApiProperty()
  message!: string;
}
