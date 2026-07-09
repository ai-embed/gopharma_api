import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssistantMessageResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  conversationId!: string;

  @ApiProperty({ enum: ['USER', 'ASSISTANT'] })
  role!: 'USER' | 'ASSISTANT';

  @ApiProperty()
  content!: string;

  @ApiProperty({ type: [String] })
  citations!: string[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AssistantConversationResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  userId!: string;

  @ApiPropertyOptional()
  title?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AssistantChatResponseDto {
  @ApiProperty()
  conversationId!: string;

  @ApiProperty({ type: AssistantMessageResponseDto })
  message!: AssistantMessageResponseDto;
}

export class AssistantConversationDetailsResponseDto {
  @ApiProperty()
  conversationId!: string;

  @ApiProperty({ type: [AssistantMessageResponseDto] })
  messages!: AssistantMessageResponseDto[];
}
