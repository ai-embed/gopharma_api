import { SupportedLanguage } from '../../common/enums/domain.enums';

export interface AiCompletionResult {
  text: string;
  citations?: string[];
}

export interface AiProvider {
  complete(input: {
    message: string;
    context?: string[];
    language?: SupportedLanguage;
  }): Promise<AiCompletionResult>;
}
