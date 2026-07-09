import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { GeocodingService } from 'src/common/services/geocoding.service';
import { MailerService } from 'src/common/services/mailer.service';
import { PharmaciesModule } from 'src/pharmacies/pharmacies.module';
import { UsersModule } from 'src/users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import {
  PasswordResetToken,
  PasswordResetTokenSchema
} from './schemas/password-reset-token.schema';
import {
  RefreshTokenBlacklist,
  RefreshTokenBlacklistSchema
} from './schemas/refresh-token-blacklist.schema';
import {
  EmailVerificationToken,
  EmailVerificationTokenSchema
} from './schemas/email-verification-token.schema';
import { GoogleTokenVerifierService } from './google-token-verifier.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PharmaciesModule,
    PassportModule.register({ session: false }),
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: RefreshTokenBlacklist.name, schema: RefreshTokenBlacklistSchema },
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
      { name: EmailVerificationToken.name, schema: EmailVerificationTokenSchema }
    ])
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    GoogleOAuthGuard,
    MailerService,
    GeocodingService,
    GoogleTokenVerifierService
  ],
  exports: [JwtStrategy]
})
export class AuthModule {}
