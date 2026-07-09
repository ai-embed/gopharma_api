import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import mongoose, { Model } from 'mongoose';
import { BadRequestException } from '@nestjs/common';
import { SupportedLanguage } from 'src/common/enums/domain.enums';
import { LocalizationService } from 'src/common/localization/localization.service';
import { loadBackendEnv } from 'src/common/testing/load-env';
import { User, UserDocument, UserSchema } from 'src/users/schemas/user.schema';
import { UsersService } from 'src/users/users.service';
import { AuthService } from './auth.service';
import {
  PasswordResetToken,
  PasswordResetTokenDocument,
  PasswordResetTokenSchema
} from './schemas/password-reset-token.schema';
import {
  RefreshTokenBlacklist,
  RefreshTokenBlacklistDocument,
  RefreshTokenBlacklistSchema
} from './schemas/refresh-token-blacklist.schema';
import {
  EmailVerificationToken,
  EmailVerificationTokenDocument,
  EmailVerificationTokenSchema
} from './schemas/email-verification-token.schema';

loadBackendEnv();
const describeIfMongo = process.env.MONGODB_URI_TEST ? describe : describe.skip;
jest.setTimeout(20000);

describeIfMongo('AuthService Mongo integration', () => {
  let userModel: Model<UserDocument>;
  let blacklistModel: Model<RefreshTokenBlacklistDocument>;
  let resetModel: Model<PasswordResetTokenDocument>;
  let verificationModel: Model<EmailVerificationTokenDocument>;
  let usersService: UsersService;
  let authService: AuthService;
  let mailerService: { sendMail: jest.Mock };
  let googleTokenVerifierService: { verify: jest.Mock };

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI_TEST!, {
        serverSelectionTimeoutMS: 5000
      });
    }

    userModel = mongoose.models.User || mongoose.model(User.name, UserSchema);
    blacklistModel =
      mongoose.models.RefreshTokenBlacklist ||
      mongoose.model(RefreshTokenBlacklist.name, RefreshTokenBlacklistSchema);
    resetModel =
      mongoose.models.PasswordResetToken ||
      mongoose.model(PasswordResetToken.name, PasswordResetTokenSchema);
    verificationModel =
      mongoose.models.EmailVerificationToken ||
      mongoose.model(EmailVerificationToken.name, EmailVerificationTokenSchema);

    const cloudinaryService = {
      uploadImage: jest.fn(),
      deleteImage: jest.fn(),
    } as never;

    usersService = new UsersService(userModel, cloudinaryService);
    mailerService = { sendMail: jest.fn() };
    googleTokenVerifierService = {
      verify: jest.fn(async () => ({
        googleId: 'google-user-id',
        email: 'google.integration@example.com',
        firstName: 'Google',
        lastName: 'User'
      }))
    };
    authService = new AuthService(
      {
        signAsync: jest.fn(async (_payload, options) => `${options.secret}-token`)
      } as unknown as JwtService,
      usersService,
      mailerService as never,
      new LocalizationService(),
      { geocodeAddress: jest.fn() } as never,
      googleTokenVerifierService as never,
      { findByIfu: jest.fn(), createFromRegistration: jest.fn() } as never,
      { createValidation: jest.fn() } as never,
      userModel,
      blacklistModel,
      resetModel,
      verificationModel
    );
  });

  beforeEach(async () => {
    await Promise.all([
      userModel.deleteMany({}).exec(),
      blacklistModel.deleteMany({}).exec(),
      resetModel.deleteMany({}).exec(),
      verificationModel.deleteMany({}).exec()
    ]);
    mailerService.sendMail.mockClear();
    googleTokenVerifierService.verify.mockClear();
    process.env.JWT_ACCESS_SECRET = 'access';
    process.env.JWT_REFRESH_SECRET = 'refresh';
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it('stores french as the default language for newly registered patients', async () => {
    const result = await authService.registerPatient({
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.integration@example.com',
      password: 'Admin123!',
      country: 'Benin'
    });

    const stored = await userModel.findById(result.user._id).lean();

    expect(stored?.preferences?.language).toBe(SupportedLanguage.FR);
  });

  it('creates a local account from a verified Google identity', async () => {
    const result = await authService.googleAuth({
      idToken: 'verified-google-id-token'
    });

    const stored = await userModel.findOne({ googleId: 'google-user-id' }).lean();

    expect(googleTokenVerifierService.verify).toHaveBeenCalledWith('verified-google-id-token');
    expect(result.user.email).toBe('google.integration@example.com');
    expect(stored?.email).toBe('google.integration@example.com');
    expect(stored?.preferences?.language).toBe(SupportedLanguage.FR);
  });

  it('persists a reset token and sends a localized email', async () => {
    const user = await userModel.create({
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'reset.integration@example.com',
      passwordHash: 'hash',
      role: 'PATIENT',
      accountStatus: 'VALIDE',
      isActive: true,
      country: 'Benin',
      preferences: {
        language: SupportedLanguage.EN,
        timezone: 'Africa/Porto-Novo',
        channels: ['IN_APP'],
        alertsEnabled: true
      }
    });

    const response = await authService.forgotPassword({
      email: user.email
    });

    const tokens = await resetModel.find({ userId: user._id }).lean();

    expect(tokens).toHaveLength(1);
    expect(mailerService.sendMail).toHaveBeenCalledWith(
      user.email,
      'GoPharma password reset',
      expect.stringContaining('Use this password reset code:')
    );
    expect(response.success).toBe(true);
  });

  it('resets the password and invalidates the reset token after use', async () => {
    const user = await userModel.create({
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'reset.complete@example.com',
      passwordHash: await bcrypt.hash('OldPass123!', 10),
      role: 'PATIENT',
      accountStatus: 'VALIDE',
      isActive: true,
      country: 'Benin',
      preferences: {
        language: SupportedLanguage.FR,
        timezone: 'Africa/Porto-Novo',
        channels: ['IN_APP'],
        alertsEnabled: true
      }
    });

    const forgot = await authService.forgotPassword({
      email: user.email
    });

    expect(forgot.success).toBe(true);
    expect(forgot.developmentToken).toBeTruthy();

    await expect(
      authService.resetPassword({
        token: forgot.developmentToken!,
        newPassword: 'NewPass123!'
      })
    ).resolves.toEqual({ success: true });

    const updatedUser = await userModel.findById(user._id).lean();
    const updatedToken = await resetModel.findOne({ userId: user._id }).lean();

    expect(updatedToken?.usedAt).toBeTruthy();
    expect(await bcrypt.compare('NewPass123!', updatedUser?.passwordHash ?? '')).toBe(true);

    await expect(
      authService.resetPassword({
        token: forgot.developmentToken!,
        newPassword: 'AnotherPass123!'
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a verification token and sends an email on patient registration', async () => {
    const result = await authService.registerPatient({
      firstName: 'Alice',
      lastName: 'Tester',
      email: 'alice.verify@example.com',
      password: 'Admin123!',
      country: 'Benin'
    });

    const user = await userModel.findOne({ email: 'alice.verify@example.com' }).lean();
    const tokens = await verificationModel.find({ userId: user?._id }).lean();

    expect(result.success).toBe(true);
    expect(result.developmentToken).toBeTruthy();
    expect(user?.emailVerifiedAt).toBeNull();
    expect(tokens).toHaveLength(1);
    expect(mailerService.sendMail).toHaveBeenCalledWith(
      'alice.verify@example.com',
      expect.stringMatching(/Vérification|Verify/),
      expect.stringMatching(/vérification|verification/i)
    );
  });

  it('verifies an email using the verification token', async () => {
    const register = await authService.registerPatient({
      firstName: 'Bob',
      lastName: 'Verify',
      email: 'bob.verify@example.com',
      password: 'Admin123!',
      country: 'Benin'
    });

    await expect(authService.verifyEmail(register.developmentToken!)).resolves.toEqual({
      success: true
    });

    const user = await userModel.findOne({ email: 'bob.verify@example.com' }).lean();
    const tokens = await verificationModel.find({ userId: user?._id }).lean();

    expect(user?.emailVerifiedAt).toBeTruthy();
    expect(tokens[0]?.usedAt).toBeTruthy();
  });

  it('resends verification codes without revealing account existence', async () => {
    await authService.registerPatient({
      firstName: 'Celine',
      lastName: 'Resend',
      email: 'celine.verify@example.com',
      password: 'Admin123!',
      country: 'Benin'
    });

    const firstUser = await userModel.findOne({ email: 'celine.verify@example.com' }).lean();
    const before = await verificationModel.find({ userId: firstUser?._id }).lean();

    const response = await authService.resendVerification('celine.verify@example.com');
    const after = await verificationModel.find({ userId: firstUser?._id }).lean();

    expect(response.success).toBe(true);
    expect(after.length).toBeGreaterThan(before.length);

    await expect(authService.resendVerification('unknown@example.com')).resolves.toEqual({
      success: true
    });
  });
});
