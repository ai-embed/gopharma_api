import { LocalizationService } from '../common/localization/localization.service';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountStatus, Role, SupportedLanguage } from '../common/enums/domain.enums';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const userId = '507f1f77bcf86cd799439011';
  const issueUser = {
    _id: { toString: () => userId },
    email: 'manager@test.local',
    role: Role.PHARMACY_MANAGER,
    accountStatus: AccountStatus.EN_ATTENTE,
    isActive: true,
    passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
    preferences: {
      language: SupportedLanguage.FR
    }
  };

  const createService = (overrides?: {
    user?: Record<string, unknown>;
    verifyPayload?: Record<string, unknown>;
    blacklisted?: boolean;
    googleIdentity?: Record<string, unknown>;
  }) => {
    const mailerService = { sendMail: jest.fn() };
    const googleTokenVerifierService = {
      verify: jest.fn(async () => ({
        googleId: 'google-user-id',
        email: 'manager@test.local',
        firstName: 'Google',
        lastName: 'User',
        ...overrides?.googleIdentity
      }))
    };
    const jwtService = {
      signAsync: jest.fn(async (_payload, options) => `${options.secret}-token`),
      verifyAsync: jest.fn(async () => ({
        sub: userId,
        jti: 'refresh-jti',
        exp: Math.floor(Date.now() / 1000) + 3600,
        ...overrides?.verifyPayload
      }))
    } as unknown as JwtService;

    const save = jest.fn(async () => undefined);
    const usersService = {
      findByGoogleId: jest.fn(async () =>
        overrides?.user?.googleId === 'google-user-id'
          ? {
              ...issueUser,
              ...overrides?.user,
              save
            }
          : null
      ),
      findByEmail: jest.fn(async () => ({
        ...issueUser,
        ...overrides?.user,
        save
      })),
      findById: jest.fn(async () => ({
        ...issueUser,
        ...overrides?.user,
        save
      }))
    };

    const service = new AuthService(
      jwtService,
      usersService as never,
      mailerService as never,
      new LocalizationService(),
      { geocodeAddress: jest.fn() } as never,
      googleTokenVerifierService as never,
      { findByIfu: jest.fn(), createFromRegistration: jest.fn() } as never,
      { createValidation: jest.fn() } as never,
      { create: jest.fn() } as never,
      {
        exists: jest.fn(() => ({ exec: jest.fn(async () => overrides?.blacklisted ?? false) })),
        updateOne: jest.fn(() => ({ exec: jest.fn(async () => ({ acknowledged: true })) }))
      } as never,
      { create: jest.fn(), find: jest.fn() } as never,
      { create: jest.fn(), find: jest.fn() } as never
    );

    return {
      service,
      usersService,
      mailerService,
      googleTokenVerifierService,
      jwtService
    };
  };

  it('blocks login for non validated accounts', async () => {
    const { service } = createService({
      user: {
        accountStatus: AccountStatus.EN_ATTENTE,
        passwordHash: '$2a$10$r5vCX6nW4jAzy4D8f7dH6.WuY7zULeXFVdHcMvmP0xSg6u40qCM/q'
      }
    });

    await expect(
      service.login({
        email: 'manager@test.local',
        password: 'Admin123!'
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('blocks login when email is not verified', async () => {
    const { service } = createService({
      user: {
        accountStatus: AccountStatus.VALIDE,
        emailVerifiedAt: null,
        passwordHash: '$2a$10$r5vCX6nW4jAzy4D8f7dH6.WuY7zULeXFVdHcMvmP0xSg6u40qCM/q'
      }
    });

    await expect(
      service.login({
        email: 'manager@test.local',
        password: 'Admin123!'
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('blacklists the previous refresh token during rotation', async () => {
    process.env.JWT_ACCESS_SECRET = 'access';
    process.env.JWT_REFRESH_SECRET = 'refresh';

    const { service } = createService({
      user: {
        accountStatus: AccountStatus.VALIDE
      }
    });

    const blacklistSpy = jest.spyOn(
      service as unknown as {
        blacklistRefreshToken: (input: Record<string, unknown>) => Promise<void>;
      },
      'blacklistRefreshToken'
    );

    await service.refreshTokens({ refreshToken: 'token' });

    expect(blacklistSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenId: 'refresh-jti',
        userId
      })
    );
  });

  it('uses remember me TTL when requested', async () => {
    process.env.JWT_ACCESS_SECRET = 'access';
    process.env.JWT_REFRESH_SECRET = 'refresh';
    process.env.JWT_REFRESH_TTL_REMEMBER = '30d';

    const passwordHash = await bcrypt.hash('Admin123!', 10);
    const { service, jwtService } = createService({
      user: {
        accountStatus: AccountStatus.VALIDE,
        emailVerifiedAt: new Date(),
        passwordHash
      }
    });

    await service.login({
      email: 'manager@test.local',
      password: 'Admin123!',
      rememberMe: true
    });

    const refreshCall = (jwtService.signAsync as jest.Mock).mock.calls.find(
      ([payload]) => Boolean(payload?.jti)
    );

    expect(refreshCall?.[1]?.expiresIn).toBe('30d');

    delete process.env.JWT_REFRESH_TTL_REMEMBER;
  });

  it('localizes forgot password email using user preference', async () => {
    const { service, mailerService } = createService({
      user: {
        accountStatus: AccountStatus.VALIDE,
        preferences: {
          language: SupportedLanguage.EN
        }
      }
    });

    await service.forgotPassword({
      email: 'manager@test.local'
    });

    expect(mailerService.sendMail).toHaveBeenCalledWith(
      'manager@test.local',
      'GoPharma password reset',
      expect.stringContaining('Use this password reset code:')
    );
  });

  it('uses verified google identity instead of trusting client fields', async () => {
    process.env.JWT_ACCESS_SECRET = 'access';
    process.env.JWT_REFRESH_SECRET = 'refresh';

    const { service, googleTokenVerifierService } = createService({
      user: {
        accountStatus: AccountStatus.VALIDE,
        googleId: 'google-user-id'
      }
    });

    await service.googleAuth({
      idToken: 'verified-token',
      email: 'spoofed@example.com',
      googleId: 'spoofed-google-id'
    });

    expect(googleTokenVerifierService.verify).toHaveBeenCalledWith('verified-token');
  });

  it('creates a session from a Google OAuth callback identity', async () => {
    process.env.JWT_ACCESS_SECRET = 'access';
    process.env.JWT_REFRESH_SECRET = 'refresh';

    const { service } = createService({
      user: {
        accountStatus: AccountStatus.VALIDE,
        googleId: 'google-user-id'
      }
    });

    const session = await service.googleOAuthCallback({
      googleId: 'google-user-id',
      email: 'manager@test.local',
      firstName: 'Google',
      lastName: 'User'
    });

    expect(session.user.email).toBe('manager@test.local');
    expect(session.accessToken).toBe('access-token');
    expect(session.refreshToken).toBe('refresh-token');
  });

  it('builds a frontend success redirect URL with tokens in the fragment', () => {
    process.env.GOOGLE_SUCCESS_REDIRECT_URL = 'http://localhost:3001/auth/google/success';

    const { service } = createService({
      user: {
        accountStatus: AccountStatus.VALIDE,
        googleId: 'google-user-id'
      }
    });

    const redirectUrl = service.buildGoogleOAuthSuccessRedirectUrl({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        _id: { toString: () => userId },
        email: 'manager@test.local',
        role: Role.PATIENT
      } as never
    });

    expect(redirectUrl).toContain('http://localhost:3001/auth/google/success#');
    expect(redirectUrl).toContain('accessToken=access-token');
    expect(redirectUrl).toContain('refreshToken=refresh-token');

    delete process.env.GOOGLE_SUCCESS_REDIRECT_URL;
  });

  it('builds a frontend failure redirect URL when configured', () => {
    process.env.GOOGLE_FAILURE_REDIRECT_URL = 'http://localhost:3001/auth/google/error';

    const { service } = createService();
    const redirectUrl = service.buildGoogleOAuthFailureRedirectUrl('oauth_failed');

    expect(redirectUrl).toBe('http://localhost:3001/auth/google/error#error=oauth_failed');

    delete process.env.GOOGLE_FAILURE_REDIRECT_URL;
  });
});
