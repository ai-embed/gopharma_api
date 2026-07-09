import { SupportedLanguage } from 'src/common/enums/domain.enums';
import { LocalizationService } from 'src/common/localization/localization.service';
import { MockAssistantProvider } from './mock-assistant.provider';

describe('MockAssistantProvider', () => {
  it('returns a localized fallback response', async () => {
    const provider = new MockAssistantProvider(new LocalizationService());

    const result = await provider.complete({
      message: 'test',
      language: SupportedLanguage.EN
    });

    expect(result.text).toContain('fallback');
    expect(result.text).toContain('Received question');
  });
});
