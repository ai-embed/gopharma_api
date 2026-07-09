import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection } from 'mongoose';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { HttpProblemDetailsFilter } from 'src/common/filters/http-problem-details.filter';
import { LocalizationService } from 'src/common/localization/localization.service';
import { loadBackendEnv } from 'src/common/testing/load-env';

loadBackendEnv();
jest.setTimeout(20000);

describe('Auth email verification (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

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
    connection = app.get<Connection>(getConnectionToken());
  });

  afterEach(async () => {
    if (connection?.readyState === 1) {
      await connection.db?.dropDatabase();
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (connection?.readyState === 1) {
      await connection.close();
    }
  });

  it('registers a patient, blocks login until email verified, then allows login', async () => {
    const email = `patient.${Date.now()}@example.com`;
    const password = 'StrongPass1!';

    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register-patient')
      .send({
        firstName: 'Alice',
        lastName: 'Tester',
        email,
        password,
        country: 'Benin'
      })
      .expect(201);

    expect(registerResponse.body.success).toBe(true);
    let verificationToken = registerResponse.body.developmentToken as string | undefined;

    if (!verificationToken) {
      const resendResponse = await request(app.getHttpServer())
        .post('/api/auth/verify-email/resend')
        .send({ email })
        .expect(200);

      verificationToken = resendResponse.body.developmentToken as string | undefined;
    }

    expect(verificationToken).toBeDefined();
    const tokenValue = String(verificationToken);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({ token: tokenValue })
      .expect(200)
      .expect({ success: true });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    expect(loginResponse.body.accessToken).toBeDefined();
    expect(loginResponse.body.refreshToken).toBeDefined();
    expect(loginResponse.body.user?.email).toBe(email.toLowerCase());
  });

  it('resend verification returns success even for unknown email', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/verify-email/resend')
      .send({ email: 'unknown@example.com' })
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
