import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

export class RegisterPatientDto {
  @ApiProperty()
  @IsString()
  @Length(1, 100)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 100)
  lastName!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/, {
    message:
      'Password must be at least 8 chars and include upper, lower, digit and special char'
  })
  password!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 100)
  country!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(6, 30)
  phoneNumber?: string;
}
