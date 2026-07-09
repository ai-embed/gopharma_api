import { SupportedLanguage } from '../enums/domain.enums';
import { LocalizationService } from './localization.service';

describe('LocalizationService', () => {
  const service = new LocalizationService();

  it('translates keys in english', () => {
    expect(
      service.translate('notification.accountReactivated.title', SupportedLanguage.EN)
    ).toBe('Account reactivated');
  });

  it('falls back to french when language is unsupported', () => {
    expect(
      service.translate('notification.accountReactivated.title', 'es' as never)
    ).toBe('Compte réactivé');
  });
});
