import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RemovePushTokenDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @IsString()
  token!: string;
}
