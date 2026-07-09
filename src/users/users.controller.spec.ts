import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus, Role, SupportedLanguage } from 'src/common/enums/domain.enums';
import { AuthenticatedUser } from 'src/common/types/authenticated-user.type';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController integration', () => {
  let controller: UsersController;
  const usersService = {
    updatePreferences: jest.fn(async (_userId: string, dto: UpdatePreferencesDto) => ({
      _id: '507f1f77bcf86cd799439011',
      preferences: {
        language: dto.language,
        timezone: 'Africa/Porto-Novo',
        channels: ['IN_APP', 'EMAIL'],
        alertsEnabled: true,
        theme: 'light'
      }
    }))
  };
  const currentUser: AuthenticatedUser = {
    userId: '507f1f77bcf86cd799439011',
    email: 'jean@example.com',
    role: Role.PATIENT,
    accountStatus: AccountStatus.VALIDE
  };
  const validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    forbidUnknownValues: true
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }]
    }).compile();

    controller = moduleFixture.get(UsersController);
  });

  it('rejects unsupported languages in preferences', async () => {
    await expect(
      validationPipe.transform(
        { language: 'es' },
        { type: 'body', metatype: UpdatePreferencesDto, data: '' }
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts english and returns the updated preference', async () => {
    const dto = (await validationPipe.transform(
      { language: SupportedLanguage.EN },
      { type: 'body', metatype: UpdatePreferencesDto, data: '' }
    )) as UpdatePreferencesDto;

    const result = await controller.updatePreferences(currentUser, dto);

    expect(result.preferences.language).toBe(SupportedLanguage.EN);
  });
});
