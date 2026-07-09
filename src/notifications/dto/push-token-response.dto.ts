import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PushTokenResponseDto {
  @ApiProperty()
  token!: string;

  @ApiPropertyOptional()
  platform?: string;

  @ApiProperty()
  createdAt!: string;
}
