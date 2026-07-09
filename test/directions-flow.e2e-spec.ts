import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { HttpProblemDetailsFilter } from 'src/common/filters/http-problem-details.filter';
import { LocalizationService } from 'src/common/localization/localization.service';
import { loadBackendEnv } from 'src/common/testing/load-env';

loadBackendEnv();

jest.setTimeout(30000);

describe('Directions flow (e2e)', () => {
  let app: INestApplication;
  const originalFetch = global.fetch;

  const setIsolatedTestDb = () => {
    const baseUri = process.env.MONGODB_URI_TEST ?? process.env.MONGODB_URI;
    if (!baseUri) {
      return;
    }
    const suffix = `gopharma_test_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const url = new URL(baseUri);
    url.pathname = `/${suffix}`;
    process.env.MONGODB_URI = url.toString();
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    setIsolatedTestDb();
    process.env.SMTP_HOST = '';
    process.env.SMTP_USER = '';
    process.env.SMTP_PASS = '';
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';

    global.fetch = (jest.fn(async () => ({
      ok: true,
      json: async () => ({
        status: 'OK',
        routes: [
          {
            overview_polyline: { points: 'mocked_polyline' },
            legs: [
              {
                distance: { text: '5 km', value: 5000 },
                duration: { text: '10 mins', value: 600 },
                start_address: 'Cotonou, Benin',
                end_address: 'Porto-Novo, Benin'
              }
            ]
          }
        ]
      })
    })) as unknown) as typeof fetch;

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(process.env.API_PREFIX ?? 'api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        forbidUnknownValues: true,
        transformOptions: { enableImplicitConversion: true }
      })
    );

    const localizationService = app.get(LocalizationService);
    app.useGlobalFilters(new HttpProblemDetailsFilter(localizationService));

    await app.init();
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    if (app) {
      await app.close();
    }
  });

  it('returns a directions response from coordinates', async () => {
    const response = await request(app.getHttpServer())
      .get(
        '/api/directions?originLat=6.3654&originLng=2.4183&destinationLat=6.4969&destinationLng=2.6288'
      )
      .expect(200);

    expect(response.body.distance?.value).toBe(5000);
    expect(response.body.duration?.value).toBe(600);
    expect(response.body.polyline).toBe('mocked_polyline');
  });
});
