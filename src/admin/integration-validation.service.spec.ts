import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IntegrationValidationService } from './integration-validation.service';

describe('IntegrationValidationService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports configured and valid SMTP integration', async () => {
    jest.spyOn(nodemailer, 'createTransport').mockReturnValue({
      verify: jest.fn(async () => true)
    } as never);

    const service = new IntegrationValidationService({
      get: jest.fn((key: string) => {
        const values: Record<string, string | number | undefined> = {
          'smtp.host': 'smtp.example.com',
          'smtp.port': 587,
          'smtp.user': 'smtp-user',
          'smtp.pass': 'smtp-pass',
          'googleMaps.apiKey': undefined
        };
        return values[key];
      })
    } as unknown as ConfigService);

    const result = await service.validateConnections();

    expect(result.smtp.status).toBe('OK');
    expect(result.googleMaps.status).toBe('UNCONFIGURED');
  });

  it('reports unconfigured smtp when credentials are missing', async () => {
    const service = new IntegrationValidationService({
      get: jest.fn(() => undefined)
    } as unknown as ConfigService);

    expect(service.getStatus()).toEqual(
      expect.objectContaining({
        smtp: expect.objectContaining({ status: 'UNCONFIGURED' }),
        googleMaps: expect.objectContaining({ status: 'UNCONFIGURED' })
      })
    );
  });

  it('reports configured and valid Google Maps integration', async () => {
    jest.spyOn(nodemailer, 'createTransport').mockReturnValue({
      verify: jest.fn(async () => true)
    } as never);

    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ status: 'OK' })
    });

    const service = new IntegrationValidationService({
      get: jest.fn((key: string) => {
        const values: Record<string, string | number> = {
          'smtp.host': 'smtp.example.com',
          'smtp.port': 587,
          'smtp.user': 'smtp-user',
          'smtp.pass': 'smtp-pass',
          'googleMaps.apiKey': 'test-api-key'
        };
        return values[key];
      })
    } as unknown as ConfigService);

    const result = await service.validateConnections();

    expect(result.googleMaps.status).toBe('OK');
    expect(result.googleMaps.configured).toBe(true);
  });

  it('reports Google Maps error when API returns error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ status: 'REQUEST_DENIED', error_message: 'Invalid API key' })
    });

    const service = new IntegrationValidationService({
      get: jest.fn((key: string) => {
        const values: Record<string, string | number> = {
          'googleMaps.apiKey': 'invalid-key'
        };
        return values[key];
      })
    } as unknown as ConfigService);

    const result = await service.validateConnections();

    expect(result.googleMaps.status).toBe('ERROR');
    expect(result.googleMaps.details).toContain('Invalid API key');
  });
});
