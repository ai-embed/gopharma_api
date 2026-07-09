import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPublicKey, createVerify, JsonWebKey } from 'crypto';
import { GoogleOAuthIdentity } from './google-oauth.types';

interface GoogleTokenHeader {
  alg?: string;
  kid?: string;
  typ?: string;
}

interface GoogleTokenPayload {
  aud?: string | string[];
  iss?: string;
  exp?: number;
  sub?: string;
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
}

interface GoogleJwk {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
  use?: string;
}

interface GoogleJwksResponse {
  keys: GoogleJwk[];
}

export type VerifiedGoogleIdentity = GoogleOAuthIdentity;

@Injectable()
export class GoogleTokenVerifierService {
  private cache = new Map<string, GoogleJwk>();
  private cacheExpiresAt = 0;

  constructor(private readonly configService: ConfigService) {}

  async verify(idToken: string): Promise<VerifiedGoogleIdentity> {
    const clientId = this.configService.get<string>('google.clientId');
    if (!clientId) {
      throw new InternalServerErrorException('Google OAuth is not configured');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = idToken.split('.');
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new UnauthorizedException('Invalid Google token format');
    }

    const header = this.parseJson<GoogleTokenHeader>(encodedHeader, 'Invalid Google token header');
    const payload = this.parseJson<GoogleTokenPayload>(
      encodedPayload,
      'Invalid Google token payload'
    );

    if (!header.kid || header.alg !== 'RS256') {
      throw new UnauthorizedException('Unsupported Google token header');
    }

    const jwk = await this.getGoogleKey(header.kid);
    const signedContent = `${encodedHeader}.${encodedPayload}`;
    const signature = Buffer.from(encodedSignature, 'base64url');
    const verifier = createVerify('RSA-SHA256');
    verifier.update(signedContent);
    verifier.end();

    const publicKey = createPublicKey({
      key: jwk as unknown as JsonWebKey,
      format: 'jwk'
    });

    if (!verifier.verify(publicKey, signature)) {
      throw new UnauthorizedException('Invalid Google token signature');
    }

    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(clientId)) {
      throw new UnauthorizedException('Google token audience mismatch');
    }

    if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss ?? '')) {
      throw new UnauthorizedException('Invalid Google token issuer');
    }

    if (!payload.exp || payload.exp * 1000 <= Date.now()) {
      throw new UnauthorizedException('Google token expired');
    }

    if (!payload.sub || !payload.email || payload.email_verified !== true) {
      throw new UnauthorizedException('Google account is missing verified identity claims');
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      firstName: payload.given_name,
      lastName: payload.family_name
    };
  }

  private parseJson<T>(value: string, errorMessage: string): T {
    try {
      return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
    } catch {
      throw new UnauthorizedException(errorMessage);
    }
  }

  private async getGoogleKey(kid: string): Promise<GoogleJwk> {
    const now = Date.now();
    if (this.cache.has(kid) && now < this.cacheExpiresAt) {
      return this.cache.get(kid)!;
    }

    const jwksUrl =
      this.configService.get<string>('google.jwksUrl') ??
      'https://www.googleapis.com/oauth2/v3/certs';
    const response = await fetch(jwksUrl);

    if (!response.ok) {
      throw new UnauthorizedException('Unable to fetch Google signing keys');
    }

    const cacheControl = response.headers.get('cache-control') ?? '';
    const maxAgeSeconds = Number(cacheControl.match(/max-age=(\d+)/)?.[1] ?? '3600');
    const data = (await response.json()) as GoogleJwksResponse;

    this.cache = new Map(data.keys.map((item) => [item.kid, item]));
    this.cacheExpiresAt = now + maxAgeSeconds * 1000;

    const jwk = this.cache.get(kid);
    if (!jwk) {
      throw new UnauthorizedException('Google signing key not found');
    }

    return jwk;
  }
}
