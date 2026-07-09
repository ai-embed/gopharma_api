import { SupportedLanguage } from 'src/common/enums/domain.enums';
import { LocalizationService } from 'src/common/localization/localization.service';
import { AssistantService } from './assistant.service';

describe('AssistantService', () => {
  it('adds an english disclaimer for english users', async () => {
    const aiProvider = {
      complete: jest.fn(async () => ({
        text: 'Base answer',
        citations: []
      }))
    };
    const usersService = {
      findById: jest.fn(async () => ({
        preferences: {
          language: SupportedLanguage.EN
        }
      }))
    };
    const conversationModel = {
      create: jest.fn(async () => ({
        _id: {
          toString: () => '507f1f77bcf86cd799439012'
        }
      }))
    };
    const createdMessages: Array<Record<string, unknown>> = [];
    const messageModel = {
      create: jest.fn(async (payload) => {
        createdMessages.push(payload);
        return payload;
      })
    };

    const service = new AssistantService(
      aiProvider as never,
      usersService as never,
      new LocalizationService(),
      conversationModel as never,
      messageModel as never
    );

    await service.chat('507f1f77bcf86cd799439011', {
      message: 'Where can I find ibuprofen?'
    });

    expect(aiProvider.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        language: SupportedLanguage.EN
      })
    );
    expect(createdMessages[1]?.content).toContain(
      'Disclaimer: This response is for information only and does not replace medical advice.'
    );
  });
});
