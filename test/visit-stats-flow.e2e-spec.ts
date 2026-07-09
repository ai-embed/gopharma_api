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
import { Pharmacy, PharmacyDocument } from 'src/pharmacies/schemas/pharmacy.schema';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { Visit, VisitDocument } from 'src/visits/schemas/visit.schema';

loadBackendEnv();

jest.setTimeout(30000);

describe('Visit stats flow (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let userModel: Model<UserDocument>;
  let pharmacyModel: Model<PharmacyDocument>;
  let visitModel: Model<VisitDocument>;

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
    pharmacyModel = app.get<Model<PharmacyDocument>>(getModelToken(Pharmacy.name));
    visitModel = app.get<Model<VisitDocument>>(getModelToken(Visit.name));

    await Promise.all([
      userModel.syncIndexes(),
      pharmacyModel.syncIndexes(),
      visitModel.syncIndexes()
    ]);
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

  it('returns total and recent visit stats for a manager pharmacy', async () => {
    const managerEmail = `manager.stats.${Date.now()}@example.com`;
    const managerPassword = 'Manager123!';
    const passwordHash = await bcrypt.hash(managerPassword, 10);

    const manager = await userModel.create({
      firstName: 'Manager',
      lastName: 'Stats',
      email: managerEmail,
      passwordHash,
      role: Role.PHARMACY_MANAGER,
      accountStatus: AccountStatus.VALIDE,
      isActive: true,
      emailVerifiedAt: new Date(),
      country: 'Benin'
    });

    const pharmacy = await pharmacyModel.create({
      name: 'Pharmacie Stats',
      address: 'Cotonou',
      location: { type: 'Point', coordinates: [2.4183, 6.3654] },
      ifu: `IFU-STATS-${Date.now()}`,
      ownerId: manager._id,
      accountStatus: AccountStatus.VALIDE,
      operationalStatus: 'OUVERT'
    });

    const visitNow = await visitModel.create({ pharmacyId: pharmacy._id });
    const visit10Days = await visitModel.create({ pharmacyId: pharmacy._id });
    const visit40Days = await visitModel.create({ pharmacyId: pharmacy._id });

    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);

    await Promise.all([
      visitModel.collection.updateOne(
        { _id: visitNow._id },
        { $set: { createdAt: now, updatedAt: now } }
      ),
      visitModel.collection.updateOne(
        { _id: visit10Days._id },
        { $set: { createdAt: tenDaysAgo, updatedAt: tenDaysAgo } }
      ),
      visitModel.collection.updateOne(
        { _id: visit40Days._id },
        { $set: { createdAt: fortyDaysAgo, updatedAt: fortyDaysAgo } }
      )
    ]);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: managerEmail, password: managerPassword })
      .expect(200);

    const token = loginResponse.body.accessToken as string;
    expect(token).toBeDefined();

    const statsResponse = await request(app.getHttpServer())
      .get('/api/manager/stats/visits')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(statsResponse.body.total).toBe(3);
    expect(statsResponse.body.last7Days).toBe(1);
    expect(statsResponse.body.last30Days).toBe(2);
  });
});
