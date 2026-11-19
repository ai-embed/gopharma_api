import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import {
  AssistantConversation,
  AssistantConversationSchema
} from './schemas/assistant-conversation.schema';
import {
  AssistantMessage,
  AssistantMessageSchema
} from './schemas/assistant-message.schema';
import { MockAssistantProvider } from './providers/mock-assistant.provider';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: AssistantConversation.name, schema: AssistantConversationSchema },
      { name: AssistantMessage.name, schema: AssistantMessageSchema }
    ])
  ],
  controllers: [AssistantController],
  providers: [AssistantService, MockAssistantProvider]
})
export class AssistantModule {}
