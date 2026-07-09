import { ConfigService } from '@nestjs/config';
import { Profile } from 'passport-google-oauth20';
import { GoogleStrategy } from './google.strategy';

describe('GoogleStrategy', () => {
  it('falls back to placeholder OAuth settings when config values are empty', () => {
    expect(
      () =>
        new GoogleStrategy({
          get: jest.fn(() => '')
        } as unknown as ConfigService)
    ).not.toThrow();
  });

  it('maps the Google profile into the internal identity shape', (done) => {
    const strategy = new GoogleStrategy({
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          'google.clientId': 'client-id',
          'google.clientSecret': 'client-secret',
          'google.callbackUrl': 'http://localhost:3000/api/auth/google/callback'
        };

        return values[key];
      })
    } as unknown as ConfigService);

    const profile = {
      id: 'google-user-id',
      emails: [{ value: 'user@example.com' }],
      name: {
        givenName: 'Jane',
        familyName: 'Doe'
      }
    } as Profile;

    strategy.validate('access', 'refresh', profile, (error, user) => {
      expect(error).toBeNull();
      expect(user).toEqual({
        googleId: 'google-user-id',
        email: 'user@example.com',
        firstName: 'Jane',
        lastName: 'Doe'
      });
      done();
    });
  });
});
