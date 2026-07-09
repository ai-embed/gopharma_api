import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class SendTestEmailDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  to!: string;
}
