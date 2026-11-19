import {
  BadRequestException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model, Types } from 'mongoose';
import { randomInt } from 'crypto';
import { v4 as uuid } from 'uuid';
import {
  AccountStatus,
  Role,
  ValidationStatus
} from '../common/enums/domain.enums';
import { LocalizationService } from '../common/localization/localization.service';
import { GeocodingService } from '../common/services/geocoding.service';
import { MailerService } from '../common/services/mailer.service';
import { PharmaciesService } from '../pharmacies/pharmacies.service';
import { PharmacyValidationsService } from '../pharmacies/pharmacy-validations.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { RegisterPharmacyDto } from './dto/register-pharmacy.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleTokenVerifierService } from './google-token-verifier.service';
import { GoogleOAuthIdentity } from './google-oauth.types';
import {
  PasswordResetToken,
  PasswordResetTokenDocument
} from './schemas/password-reset-token.schema';
import {
  RefreshTokenBlacklist,
  RefreshTokenBlacklistDocument
} from './schemas/refresh-token-blacklist.schema';
import {
  EmailVerificationToken,
  EmailVerificationTokenDocument
} from './schemas/email-verification-token.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly mailerService: MailerService,
    private readonly localizationService: LocalizationService,
    private readonly geocodingService: GeocodingService,
    private readonly googleTokenVerifierService: GoogleTokenVerifierService,
    private readonly pharmaciesService: PharmaciesService,
    private readonly pharmacyValidationsService: PharmacyValidationsService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(RefreshTokenBlacklist.name)
    private readonly blacklistModel: Model<RefreshTokenBlacklistDocument>,
    @InjectModel(PasswordResetToken.name)
    private readonly resetModel: Model<PasswordResetTokenDocument>,
    @InjectModel(EmailVerificationToken.name)
    private readonly verificationModel: Model<EmailVerificationTokenDocument>
  ) {}

  private async issueTokens(user: UserDocument, rememberMe = false) {
    const refreshTokenId = uuid();
    const refreshTtl =
      rememberMe && process.env.JWT_REFRESH_TTL_REMEMBER
        ? process.env.JWT_REFRESH_TTL_REMEMBER
        : process.env.JWT_REFRESH_TTL ?? '7d';

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user._id.toString(),
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus
      },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_TTL ?? '7d'
      }
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user._id.toString(),
        jti: refreshTokenId,
        rememberMe
      },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: refreshTtl
      }
    );

    return { accessToken, refreshToken };
  }

  private async createEmailVerificationToken(user: UserDocument) {
    const verificationToken = String(randomInt(100000, 1000000));
    const tokenHash = await bcrypt.hash(verificationToken, 10);
    const ttlMinutes = Number(process.env.EMAIL_VERIFICATION_TTL_MINUTES ?? 1440);

    await this.verificationModel.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000)
    });

    await this.mailerService.sendMail(
      user.email,
      this.localizationService.translate(
        'auth.emailVerification.subject',
        user.preferences?.language
      ),
      this.localizationService.translate(
        'auth.emailVerification.body',
        user.preferences?.language,
        { verificationToken }
      )
    );

    return verificationToken;
  }

  private async resolveGoogleUser(identity: GoogleOAuthIdentity) {
    let user = await this.usersService.findByGoogleId(identity.googleId);
    if (!user) {
      const byEmail = await this.usersService.findByEmail(identity.email);
      if (byEmail) {
        byEmail.googleId = identity.googleId;
        await byEmail.save();
        user = byEmail;
      } else {
        user = await this.userModel.create({
          firstName: identity.firstName ?? 'Google',
          lastName: identity.lastName ?? 'User',
          email: identity.email.toLowerCase(),
          googleId: identity.googleId,
          role: Role.PATIENT,
          country: 'Benin',
          accountStatus: AccountStatus.VALIDE,
          isActive: true,
          emailVerifiedAt: new Date()
        });
      }
    }

    if (!user.emailVerifiedAt) {
      user.emailVerifiedAt = new Date();
      await user.save();
    }

    if (!user.isActive || user.accountStatus !== AccountStatus.VALIDE) {
      throw new UnauthorizedException('Account is not allowed to authenticate');
    }

    return user;
  }

  private async createGoogleAuthSession(identity: GoogleOAuthIdentity) {
    const user = await this.resolveGoogleUser(identity);

    return {
      user,
      ...(await this.issueTokens(user))
    };
  }

  private async blacklistRefreshToken(input: {
    tokenId: string;
    userId: string;
    exp: number;
  }) {
    await this.blacklistModel
      .updateOne(
        { tokenId: input.tokenId },
        {
          $setOnInsert: {
            tokenId: input.tokenId,
            userId: new Types.ObjectId(input.userId),
            expiresAt: new Date(input.exp * 1000)
          }
        },
        { upsert: true }
      )
      .exec();
  }

  async registerPatient(dto: RegisterPatientDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.userModel.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      passwordHash,
      country: dto.country,
      phoneNumber: dto.phoneNumber || null,
      role: Role.PATIENT,
      accountStatus: AccountStatus.VALIDE,
      isActive: true,
      emailVerifiedAt: null
    });

    const verificationToken = await this.createEmailVerificationToken(user);

    return {
      success: true,
      message: 'Verification email sent',
      user,
      ...(process.env.NODE_ENV !== 'production' && {
        developmentToken: verificationToken
      })
    };
  }

  async registerPharmacy(dto: RegisterPharmacyDto) {
    const existing = await this.usersService.findByEmail(dto.managerEmail);
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const existingIfu = await this.pharmaciesService.findByIfu(dto.ifu);
    if (existingIfu) {
      throw new BadRequestException('IFU already used');
    }

    // Geocode address if coordinates not provided
    let latitude = dto.latitude;
    let longitude = dto.longitude;

    if (latitude === undefined || longitude === undefined) {
      const geocodingResult = await this.geocodingService.geocodeAddress(dto.pharmacyAddress);
      if (geocodingResult) {
        latitude = geocodingResult.latitude;
        longitude = geocodingResult.longitude;
      } else {
        throw new BadRequestException(
          'Could not geocode address. Please provide latitude and longitude manually.'
        );
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const manager = await this.userModel.create({
      firstName: dto.managerFirstName,
      lastName: dto.managerLastName,
      email: dto.managerEmail.toLowerCase(),
      passwordHash,
      country: dto.country,
      role: Role.PHARMACY_MANAGER,
      accountStatus: AccountStatus.EN_ATTENTE,
      isActive: true
    });

    const pharmacy = await this.pharmaciesService.createFromRegistration(manager, {
      ...dto,
      latitude,
      longitude
    });

    await this.pharmacyValidationsService.createValidation({
      pharmacyId: pharmacy._id.toString(),
      requestedByUserId: manager._id.toString(),
      status: ValidationStatus.EN_ATTENTE,
      documents: dto.documentFileIds ?? []
    });

    return {
      manager,
      pharmacy,
      message: 'Pharmacy account created and pending manual validation'
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    if (user.accountStatus !== AccountStatus.VALIDE) {
      throw new UnauthorizedException('Account is not validated');
    }

    if (user.emailVerifiedAt === null) {
      throw new UnauthorizedException('Email not verified');
    }

    return {
      user,
      ...(await this.issueTokens(user, dto.rememberMe ?? false))
    };
  }

  async googleAuth(dto: GoogleAuthDto) {
    const identity = await this.googleTokenVerifierService.verify(dto.idToken);
    return this.createGoogleAuthSession(identity);
  }

  async googleOAuthCallback(identity: GoogleOAuthIdentity) {
    return this.createGoogleAuthSession(identity);
  }

  buildGoogleOAuthSuccessRedirectUrl(session: {
    accessToken: string;
    refreshToken: string;
    user: UserDocument;
  }) {
    const redirectBase = process.env.GOOGLE_SUCCESS_REDIRECT_URL;
    if (!redirectBase) {
      return null;
    }

    const params = new URLSearchParams({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      userId: session.user._id.toString(),
      email: session.user.email,
      role: session.user.role
    });

    return `${redirectBase}#${params.toString()}`;
  }

  buildGoogleOAuthFailureRedirectUrl(reason: string) {
    const redirectBase = process.env.GOOGLE_FAILURE_REDIRECT_URL;
    if (!redirectBase) {
      return null;
    }

    const params = new URLSearchParams({ error: reason });
    return `${redirectBase}#${params.toString()}`;
  }

  async refreshTokens(dto: RefreshTokenDto) {
    const payload = await this.jwtService.verifyAsync<{
      sub: string;
      jti: string;
      exp: number;
      rememberMe?: boolean;
    }>(dto.refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET
    });

    const isBlacklisted = await this.blacklistModel
      .exists({ tokenId: payload.jti })
      .exec();
    if (isBlacklisted) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user.isActive || user.accountStatus !== AccountStatus.VALIDE) {
      throw new UnauthorizedException('Account is not allowed to refresh');
    }

    await this.blacklistRefreshToken({
      tokenId: payload.jti,
      userId: payload.sub,
      exp: payload.exp
    });

    return {
      ...(await this.issueTokens(user, payload.rememberMe ?? false))
    };
  }

  async logout(dto: RefreshTokenDto) {
    const payload = await this.jwtService.verifyAsync<{
      sub: string;
      jti: string;
      exp: number;
    }>(dto.refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET
    });

    await this.blacklistRefreshToken({
      tokenId: payload.jti,
      userId: payload.sub,
      exp: payload.exp
    });

    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      return { success: true };
    }

    const resetToken = uuid();
    const tokenHash = await bcrypt.hash(resetToken, 10);

    await this.resetModel.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + 1000 * 60 * 30)
    });

    await this.mailerService.sendMail(
      user.email,
      this.localizationService.translate(
        'auth.passwordReset.subject',
        user.preferences?.language
      ),
      this.localizationService.translate('auth.passwordReset.body', user.preferences?.language, {
        resetToken
      })
    );

    return {
      success: true,
      ...(process.env.NODE_ENV !== 'production' && { developmentToken: resetToken })
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const resetEntries = await this.resetModel
      .find({ usedAt: { $exists: false }, expiresAt: { $gt: new Date() } })
      .exec();

    const match = await Promise.any(
      resetEntries.map(async (entry) => {
        const ok = await bcrypt.compare(dto.token, entry.tokenHash);
        if (!ok) {
          throw new Error('No match');
        }
        return entry;
      })
    ).catch(() => null);

    if (!match) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.usersService.findById(match.userId.toString());
    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await user.save();

    match.usedAt = new Date();
    await match.save();

    return { success: true };
  }

  async verifyEmail(token: string) {
    const entries = await this.verificationModel
      .find({ usedAt: { $exists: false }, expiresAt: { $gt: new Date() } })
      .exec();

    const match = await Promise.any(
      entries.map(async (entry) => {
        const ok = await bcrypt.compare(token, entry.tokenHash);
        if (!ok) {
          throw new Error('No match');
        }
        return entry;
      })
    ).catch(() => null);

    if (!match) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const user = await this.usersService.findById(match.userId.toString());
    user.emailVerifiedAt = new Date();
    await user.save();

    match.usedAt = new Date();
    await match.save();

    return { success: true };
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.emailVerifiedAt !== null) {
      return { success: true };
    }

    const verificationToken = await this.createEmailVerificationToken(user);
    return {
      success: true,
      ...(process.env.NODE_ENV !== 'production' && {
        developmentToken: verificationToken
      })
    };
  }
}
