import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { GoogleOAuthIdentity } from '../google-oauth.types';

const getConfigValue = (configService: ConfigService, key: string, fallback: string) =>
  configService.get<string>(key)?.trim() || fallback;

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: getConfigValue(configService, 'google.clientId', 'google-client-id-not-configured'),
      clientSecret: getConfigValue(
        configService,
        'google.clientSecret',
        'google-client-secret-not-configured'
      ),
      callbackURL: getConfigValue(
        configService,
        'google.callbackUrl',
        'http://localhost:3000/auth/google/callback'
      ),
      scope: ['email', 'profile']
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback
  ): void {
    const email = profile.emails?.[0]?.value?.toLowerCase();
    const googleId = profile.id;

    if (!email || !googleId) {
      done(new Error('Google profile is missing required identity fields'), undefined);
      return;
    }

    const identity: GoogleOAuthIdentity = {
      googleId,
      email,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName
    };

    done(null, identity);
  }
}
