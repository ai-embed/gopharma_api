import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { Connection, Model } from 'mongoose';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { AccountStatus, Role } from 'src/common/enums/domain.enums';
import { HttpProblemDetailsFilter } from 'src/common/filters/http-problem-details.filter';
import { LocalizationService } from 'src/common/localization/localization.service';
import { loadBackendEnv } from 'src/common/testing/load-env';
import { User, UserDocument } from 'src/users/schemas/user.schema';

loadBackendEnv();

jest.setTimeout(30000);

describe('Push tokens flow (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let userModel: Model<UserDocument>;

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
    userModel = app.get<Model<UserDocument>>(getModelToken(User.name));

    await userModel.syncIndexes();
  });

  afterAll(async () => {
    if (connection?.readyState === 1) {
      await connection.db?.dropDatabase();
    }
    if (app) {
      await app.close();
    }
    if (connection?.readyState === 1) {
      await connection.close();
    }
  });

  it('registers and removes push tokens for the current user', async () => {
    const email = `patient.push.${Date.now()}@example.com`;
    const password = 'Patient123!';
    const passwordHash = await bcrypt.hash(password, 10);

    await userModel.create({
      firstName: 'Push',
      lastName: 'Patient',
      email,
      passwordHash,
      role: Role.PATIENT,
      accountStatus: AccountStatus.VALIDE,
      isActive: true,
      emailVerifiedAt: new Date(),
      country: 'Benin'
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    const token = loginResponse.body.accessToken as string;
    expect(token).toBeDefined();

    const deviceToken = `ExponentPushToken[${Date.now()}]`;

    await request(app.getHttpServer())
      .post('/api/notifications/push-tokens')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: deviceToken, platform: 'ios' })
      .expect(201);

    const listResponse = await request(app.getHttpServer())
      .get('/api/notifications/push-tokens')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(listResponse.body)).toBe(true);
    expect(listResponse.body[0]?.token).toBe(deviceToken);

    await request(app.getHttpServer())
      .delete('/api/notifications/push-tokens')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: deviceToken })
      .expect(200);

    const emptyResponse = await request(app.getHttpServer())
      .get('/api/notifications/push-tokens')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(emptyResponse.body).toHaveLength(0);
  });
});
