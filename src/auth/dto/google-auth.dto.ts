import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({
    description: 'Google ID token to verify server-side',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...'
  })
  @IsString()
  idToken!: string;

  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsString()
  googleId?: string;

  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsString()
  lastName?: string;
}
