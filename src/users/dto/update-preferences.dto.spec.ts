import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SupportedLanguage, ThemePreference } from '../../common/enums/domain.enums';
import { UpdatePreferencesDto } from './update-preferences.dto';

describe('UpdatePreferencesDto', () => {
  it('accepts french and english as supported languages', async () => {
    const frenchDto = plainToInstance(UpdatePreferencesDto, {
      language: SupportedLanguage.FR
    });
    const englishDto = plainToInstance(UpdatePreferencesDto, {
      language: SupportedLanguage.EN
    });

    expect(await validate(frenchDto)).toHaveLength(0);
    expect(await validate(englishDto)).toHaveLength(0);
  });

  it('rejects unsupported languages', async () => {
    const dto = plainToInstance(UpdatePreferencesDto, {
      language: 'es'
    });

    const errors = await validate(dto);
    expect(errors).not.toHaveLength(0);
  });

  it('accepts supported themes and rejects invalid values', async () => {
    const darkDto = plainToInstance(UpdatePreferencesDto, {
      theme: ThemePreference.DARK
    });
    expect(await validate(darkDto)).toHaveLength(0);

    const invalidDto = plainToInstance(UpdatePreferencesDto, {
      theme: 'blue'
    });
    const errors = await validate(invalidDto);
    expect(errors).not.toHaveLength(0);
  });
});
