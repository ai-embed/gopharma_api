import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection, Model } from 'mongoose';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { AccountStatus, Role } from 'src/common/enums/domain.enums';
import { HttpProblemDetailsFilter } from 'src/common/filters/http-problem-details.filter';
import { LocalizationService } from 'src/common/localization/localization.service';
import { loadBackendEnv } from 'src/common/testing/load-env';
import { InventoryItem, InventoryItemDocument } from 'src/catalog/schemas/inventory-item.schema';
import { Product, ProductDocument } from 'src/catalog/schemas/product.schema';
import { Pharmacy, PharmacyDocument } from 'src/pharmacies/schemas/pharmacy.schema';
import { Schedule, ScheduleDocument } from 'src/schedules/schemas/schedule.schema';
import { User, UserDocument } from 'src/users/schemas/user.schema';

loadBackendEnv();

jest.setTimeout(30000);

describe('Search products flow (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let userModel: Model<UserDocument>;
  let pharmacyModel: Model<PharmacyDocument>;
  let productModel: Model<ProductDocument>;
  let inventoryModel: Model<InventoryItemDocument>;
  let scheduleModel: Model<ScheduleDocument>;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    if (process.env.MONGODB_URI_TEST) {
      process.env.MONGODB_URI = process.env.MONGODB_URI_TEST;
    }
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
    productModel = app.get<Model<ProductDocument>>(getModelToken(Product.name));
    inventoryModel = app.get<Model<InventoryItemDocument>>(getModelToken(InventoryItem.name));
    scheduleModel = app.get<Model<ScheduleDocument>>(getModelToken(Schedule.name));

    await Promise.all([
      userModel.syncIndexes(),
      pharmacyModel.syncIndexes(),
      productModel.syncIndexes(),
      inventoryModel.syncIndexes(),
      scheduleModel.syncIndexes()
    ]);
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

  it('filters by distance, availability and openNow when searching products', async () => {
    const ownerOpen = await userModel.create({
      firstName: 'Open',
      lastName: 'Manager',
      email: `open.${Date.now()}@example.com`,
      passwordHash: 'hash',
      role: Role.PHARMACY_MANAGER,
      accountStatus: AccountStatus.VALIDE,
      isActive: true,
      emailVerifiedAt: new Date(),
      country: 'Benin'
    });

    const ownerClosed = await userModel.create({
      firstName: 'Closed',
      lastName: 'Manager',
      email: `closed.${Date.now()}@example.com`,
      passwordHash: 'hash',
      role: Role.PHARMACY_MANAGER,
      accountStatus: AccountStatus.VALIDE,
      isActive: true,
      emailVerifiedAt: new Date(),
      country: 'Benin'
    });

    const ownerFar = await userModel.create({
      firstName: 'Far',
      lastName: 'Manager',
      email: `far.${Date.now()}@example.com`,
      passwordHash: 'hash',
      role: Role.PHARMACY_MANAGER,
      accountStatus: AccountStatus.VALIDE,
      isActive: true,
      emailVerifiedAt: new Date(),
      country: 'Benin'
    });

    const openPharmacy = await pharmacyModel.create({
      name: 'Pharmacie Ouverte',
      address: 'Cotonou',
      location: { type: 'Point', coordinates: [2.4183, 6.3654] },
      ifu: `IFU-OPEN-${Date.now()}`,
      ownerId: ownerOpen._id,
      accountStatus: AccountStatus.VALIDE,
      operationalStatus: 'OUVERT'
    });

    const closedPharmacy = await pharmacyModel.create({
      name: 'Pharmacie Fermee',
      address: 'Cotonou',
      location: { type: 'Point', coordinates: [2.419, 6.366] },
      ifu: `IFU-CLOSED-${Date.now()}`,
      ownerId: ownerClosed._id,
      accountStatus: AccountStatus.VALIDE,
      operationalStatus: 'OUVERT'
    });

    const farPharmacy = await pharmacyModel.create({
      name: 'Pharmacie Loin',
      address: 'Parakou',
      location: { type: 'Point', coordinates: [2.63, 9.34] },
      ifu: `IFU-FAR-${Date.now()}`,
      ownerId: ownerFar._id,
      accountStatus: AccountStatus.VALIDE,
      operationalStatus: 'OUVERT'
    });

    const today = new Date();
    const dayOfWeek = today.getUTCDay();

    await scheduleModel.create({
      pharmacyId: openPharmacy._id,
      weekly: [
        {
          dayOfWeek,
          openTime: '00:00',
          closeTime: '23:59',
          isClosed: false,
          onDuty: false
        }
      ],
      exceptions: []
    });

    await scheduleModel.create({
      pharmacyId: closedPharmacy._id,
      weekly: [
        {
          dayOfWeek,
          openTime: '00:00',
          closeTime: '23:59',
          isClosed: true,
          onDuty: false
        }
      ],
      exceptions: []
    });

    const product = await productModel.create({
      name: 'Paracetamol 500mg',
      scientificName: 'Paracetamol',
      isMedicine: true,
      category: 'Antalgique'
    });

    await inventoryModel.create({
      pharmacyId: openPharmacy._id,
      productId: product._id,
      price: 1200,
      stockQuantity: 10,
      alertThreshold: 2,
      isAvailable: true,
      lastUpdatedAt: new Date()
    });

    await inventoryModel.create({
      pharmacyId: closedPharmacy._id,
      productId: product._id,
      price: 1100,
      stockQuantity: 8,
      alertThreshold: 2,
      isAvailable: true,
      lastUpdatedAt: new Date()
    });

    await inventoryModel.create({
      pharmacyId: farPharmacy._id,
      productId: product._id,
      price: 1000,
      stockQuantity: 6,
      alertThreshold: 2,
      isAvailable: true,
      lastUpdatedAt: new Date()
    });

    const response = await request(app.getHttpServer())
      .get('/api/search/products')
      .query({
        q: 'Paracetamol',
        lat: 6.3654,
        lng: 2.4183,
        radiusKm: 5,
        openNow: true
      })
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]?.pharmacyId?._id).toBe(openPharmacy._id.toString());
    expect(response.body[0]?.pharmacyId?.name).toBe('Pharmacie Ouverte');
    expect(response.body[0]?.productId?.name).toBe('Paracetamol 500mg');
    expect(response.body[0]?.price).toBe(1200);
    expect(response.body[0]?.stockQuantity).toBe(10);
    expect(response.body[0]?.isAvailable).toBe(true);
  });
});
