import { ConfigService } from '@nestjs/config';
import { createSign, generateKeyPairSync } from 'crypto';
import { GoogleTokenVerifierService } from './google-token-verifier.service';

const base64url = (value: string | Buffer) => Buffer.from(value).toString('base64url');

describe('GoogleTokenVerifierService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.GOOGLE_CLIENT_ID;
  });

  it('verifies a valid Google id token server-side', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-id-123';
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048
    });
    const jwk = publicKey.export({ format: 'jwk' }) as JsonWebKey & {
      n: string;
      e: string;
    };
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: 'kid-1'
    };
    const payload = {
      aud: 'client-id-123',
      iss: 'https://accounts.google.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
      sub: 'google-sub',
      email: 'user@example.com',
      email_verified: true,
      given_name: 'Jane',
      family_name: 'Doe'
    };
    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));
    const signer = createSign('RSA-SHA256');
    signer.update(`${encodedHeader}.${encodedPayload}`);
    signer.end();
    const signature = signer.sign(privateKey).toString('base64url');
    const idToken = `${encodedHeader}.${encodedPayload}.${signature}`;

    global.fetch = jest.fn(async () => ({
      ok: true,
      headers: {
        get: jest.fn(() => 'public, max-age=3600')
      },
      json: jest.fn(async () => ({
        keys: [
          {
            kid: 'kid-1',
            kty: 'RSA',
            alg: 'RS256',
            use: 'sig',
            n: jwk.n,
            e: jwk.e
          }
        ]
      }))
    })) as never;

    const service = new GoogleTokenVerifierService({
      get: jest.fn((key: string) =>
        key === 'google.clientId'
          ? 'client-id-123'
          : 'https://www.googleapis.com/oauth2/v3/certs'
      )
    } as unknown as ConfigService);

    await expect(service.verify(idToken)).resolves.toEqual({
      googleId: 'google-sub',
      email: 'user@example.com',
      firstName: 'Jane',
      lastName: 'Doe'
    });
  });
});
