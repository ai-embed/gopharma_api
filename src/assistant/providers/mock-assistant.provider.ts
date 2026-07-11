import { Injectable } from '@nestjs/common';
import { LocalizationService } from '../../common/localization/localization.service';
import { AiCompletionResult, AiProvider } from './ai-provider.interface';

@Injectable()
export class MockAssistantProvider implements AiProvider {
  constructor(private readonly localizationService: LocalizationService) {}

  async complete(input: {
    message: string;
    context?: string[];
    language?: 'fr' | 'en';
  }): Promise<AiCompletionResult> {
    const language = this.localizationService.normalizeLanguage(input.language);

    return {
      text: this.localizationService.translate('assistant.fallback.mock', language, {
        message: input.message
      })
    };
  }
}
