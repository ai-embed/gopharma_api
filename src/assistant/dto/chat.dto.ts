import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ChatDto {
  @ApiPropertyOptional({ example: '65f0d2d7c9a1b33d7d9b1234' })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiProperty({ example: 'Où puis-je trouver de l ibuprofène ?' })
  @IsString()
  message!: string;
}
