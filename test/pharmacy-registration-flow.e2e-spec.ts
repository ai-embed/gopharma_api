import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { Connection, Model } from 'mongoose';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { HttpProblemDetailsFilter } from 'src/common/filters/http-problem-details.filter';
import { LocalizationService } from 'src/common/localization/localization.service';
import { loadBackendEnv } from 'src/common/testing/load-env';
import { AccountStatus, Role, ValidationStatus } from 'src/common/enums/domain.enums';
import { User, UserDocument } from 'src/users/schemas/user.schema';

loadBackendEnv();

jest.setTimeout(30000);

describe('Pharmacy registration flow (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<UserDocument>;
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

    userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
    connection = app.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
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

  it('registers a pharmacy, uploads docs, and validates via admin approval', async () => {
    const adminEmail = 'admin.flow@example.com';
    const adminPassword = 'Admin123!';
    const adminHash = await bcrypt.hash(adminPassword, 10);

    await userModel.create({
      firstName: 'Admin',
      lastName: 'Root',
      email: adminEmail,
      passwordHash: adminHash,
      role: Role.ADMIN,
      accountStatus: AccountStatus.VALIDE,
      isActive: true,
      emailVerifiedAt: new Date(),
      country: 'Benin'
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);

    const adminToken = adminLogin.body.accessToken as string;
    expect(adminToken).toBeDefined();

    const uploadResponse = await request(app.getHttpServer())
      .post('/api/files')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('doc'), 'doc.txt')
      .expect(201);

    const fileId = uploadResponse.body.fileId as string;
    expect(fileId).toBeDefined();

    const managerEmail = `manager.${Date.now()}@example.com`;
    const managerPassword = 'Manager123!';
    const ifu = `IFU-${Date.now()}`;

    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register-pharmacy')
      .send({
        managerFirstName: 'Sarah',
        managerLastName: 'Manager',
        managerEmail,
        password: managerPassword,
        country: 'Benin',
        pharmacyName: 'Pharmacie Flow',
        pharmacyAddress: 'Cotonou',
        ifu,
        latitude: 6.3654,
        longitude: 2.4183,
        documentFileIds: [fileId]
      })
      .expect(201);

    const managerId = registerResponse.body.manager?._id as string;
    expect(managerId).toBeDefined();

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: managerEmail, password: managerPassword })
      .expect(401);

    const validationsResponse = await request(app.getHttpServer())
      .get('/api/admin/validations')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const validations = validationsResponse.body as Array<{
      _id: string;
      requestedByUserId: string;
      status: ValidationStatus;
      documents: string[];
    }>;

    const validation = validations.find(
      (entry) => entry.requestedByUserId === managerId
    );

    expect(validation).toBeDefined();
    expect(validation?.status).toBe(ValidationStatus.EN_ATTENTE);
    expect(validation?.documents).toContain(fileId);

    const approvalResponse = await request(app.getHttpServer())
      .post(`/api/admin/validations/${validation?._id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ comment: 'OK' })
      .expect(201);

    expect(approvalResponse.body.validation?.status).toBe(ValidationStatus.VALIDE);
    expect(approvalResponse.body.pharmacy?.accountStatus).toBe(AccountStatus.VALIDE);

    const managerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: managerEmail, password: managerPassword })
      .expect(200);

    expect(managerLogin.body.user?.emailVerifiedAt).toBeDefined();
    expect(managerLogin.body.accessToken).toBeDefined();
  });
});
