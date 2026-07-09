import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleAuthDto } from './dto/google-auth.dto';

describe('AuthController integration', () => {
  let controller: AuthController;
  const authService = {
    googleAuth: jest.fn(async () => ({ accessToken: 'access', refreshToken: 'refresh' }))
  };
  const validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    forbidUnknownValues: true
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }]
    }).compile();

    controller = moduleFixture.get(AuthController);
  });

  it('rejects google auth payloads without idToken', async () => {
    await expect(
      validationPipe.transform(
        {},
        { type: 'body', metatype: GoogleAuthDto, data: '' }
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a valid google auth payload and calls the service', async () => {
    const dto = (await validationPipe.transform(
      { idToken: 'token-value' },
      { type: 'body', metatype: GoogleAuthDto, data: '' }
    )) as GoogleAuthDto;

    await controller.google(dto);

    expect(authService.googleAuth).toHaveBeenCalledWith({ idToken: 'token-value' });
  });
});
