import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from './mailer.service';

describe('MailerService', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const configService = {
    get: jest.fn()
  } as unknown as ConfigService;
  const mailerService = new MailerService(configService);

  afterEach(() => {
    jest.clearAllMocks();
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('fails explicitly in production when SMTP is not configured', async () => {
    process.env.NODE_ENV = 'production';

    await expect(
      mailerService.sendMail('user@example.test', 'Reset password', 'reset code')
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('allows SMTP to be omitted outside production', async () => {
    process.env.NODE_ENV = 'test';

    await expect(
      mailerService.sendMail('user@example.test', 'Reset password', 'reset code')
    ).resolves.toBeUndefined();
  });
});
