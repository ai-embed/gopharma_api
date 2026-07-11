import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { ChatDto } from './dto/chat.dto';
import {
  AssistantChatResponseDto,
  AssistantConversationDetailsResponseDto,
  AssistantConversationResponseDto
} from './dto/assistant-response.dto';
import { AssistantService } from './assistant.service';

@ApiTags('Assistant')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('chat')
  @ApiCreatedResponse({ type: AssistantChatResponseDto })
  chat(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChatDto) {
    return this.assistantService.chat(user.userId, dto);
  }

  @Get('conversations')
  @ApiOkResponse({ type: AssistantConversationResponseDto, isArray: true })
  listConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.assistantService.listConversations(user.userId);
  }

  @Get('conversations/:id')
  @ApiOkResponse({ type: AssistantConversationDetailsResponseDto })
  getConversation(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.assistantService.getConversation(user.userId, id);
  }
}
