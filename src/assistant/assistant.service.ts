import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LocalizationService } from '../common/localization/localization.service';
import { UsersService } from '../users/users.service';
import {
  AssistantConversation,
  AssistantConversationDocument
} from './schemas/assistant-conversation.schema';
import {
  AssistantMessage,
  AssistantMessageDocument
} from './schemas/assistant-message.schema';
import { MockAssistantProvider } from './providers/mock-assistant.provider';

@Injectable()
export class AssistantService {
  constructor(
    private readonly aiProvider: MockAssistantProvider,
    private readonly usersService: UsersService,
    private readonly localizationService: LocalizationService,
    @InjectModel(AssistantConversation.name)
    private readonly conversationModel: Model<AssistantConversationDocument>,
    @InjectModel(AssistantMessage.name)
    private readonly messageModel: Model<AssistantMessageDocument>
  ) {}

  async chat(userId: string, input: { conversationId?: string; message: string }) {
    const user = await this.usersService.findById(userId);
    const language = this.localizationService.normalizeLanguage(user.preferences?.language);
    let conversationId = input.conversationId;

    if (!conversationId) {
      const conversation = await this.conversationModel.create({
        userId: new Types.ObjectId(userId),
        title: input.message.slice(0, 60)
      });
      conversationId = conversation._id.toString();
    }

    await this.messageModel.create({
      conversationId: new Types.ObjectId(conversationId),
      role: 'USER',
      content: input.message
    });

    const completion = await this.aiProvider.complete({
      message: input.message,
      language
    });

    const disclaimer = this.localizationService.translate('assistant.disclaimer', language);

    const assistantMessage = await this.messageModel.create({
      conversationId: new Types.ObjectId(conversationId),
      role: 'ASSISTANT',
      content: `${completion.text}\n\n${disclaimer}`,
      citations: completion.citations ?? []
    });

    return {
      conversationId,
      message: assistantMessage
    };
  }

  async listConversations(userId: string) {
    return this.conversationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async getConversation(userId: string, conversationId: string) {
    await this.conversationModel
      .findOne({ _id: conversationId, userId: new Types.ObjectId(userId) })
      .orFail();

    const messages = await this.messageModel
      .find({ conversationId: new Types.ObjectId(conversationId) })
      .sort({ createdAt: 1 })
      .exec();

    return {
      conversationId,
      messages
    };
  }
}
