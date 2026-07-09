import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { Connection, Model } from 'mongoose';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { AccountStatus, Role, StockMovementType } from 'src/common/enums/domain.enums';
import { HttpProblemDetailsFilter } from 'src/common/filters/http-problem-details.filter';
import { LocalizationService } from 'src/common/localization/localization.service';
import { loadBackendEnv } from 'src/common/testing/load-env';
import { InventoryItem, InventoryItemDocument } from 'src/catalog/schemas/inventory-item.schema';
import { Product, ProductDocument } from 'src/catalog/schemas/product.schema';
import { Pharmacy, PharmacyDocument } from 'src/pharmacies/schemas/pharmacy.schema';
import { User, UserDocument } from 'src/users/schemas/user.schema';

loadBackendEnv();

jest.setTimeout(30000);

describe('Stock movements flow (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let userModel: Model<UserDocument>;
  let pharmacyModel: Model<PharmacyDocument>;
  let productModel: Model<ProductDocument>;
  let inventoryModel: Model<InventoryItemDocument>;

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
    productModel = app.get<Model<ProductDocument>>(getModelToken(Product.name));
    inventoryModel = app.get<Model<InventoryItemDocument>>(getModelToken(InventoryItem.name));

    await Promise.all([
      userModel.syncIndexes(),
      pharmacyModel.syncIndexes(),
      productModel.syncIndexes(),
      inventoryModel.syncIndexes()
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

  it('returns stock movements for the manager pharmacy', async () => {
    const managerEmail = `manager.movements.${Date.now()}@example.com`;
    const managerPassword = 'Manager123!';
    const passwordHash = await bcrypt.hash(managerPassword, 10);

    const manager = await userModel.create({
      firstName: 'Manager',
      lastName: 'Moves',
      email: managerEmail,
      passwordHash,
      role: Role.PHARMACY_MANAGER,
      accountStatus: AccountStatus.VALIDE,
      isActive: true,
      emailVerifiedAt: new Date(),
      country: 'Benin'
    });

    const pharmacy = await pharmacyModel.create({
      name: 'Pharmacie Mouvements',
      address: 'Cotonou',
      location: { type: 'Point', coordinates: [2.4183, 6.3654] },
      ifu: `IFU-MOVE-${Date.now()}`,
      ownerId: manager._id,
      accountStatus: AccountStatus.VALIDE,
      operationalStatus: 'OUVERT'
    });

    const product = await productModel.create({
      name: 'Aspirine 100mg',
      scientificName: 'Aspirin',
      isMedicine: true,
      category: 'Antalgique'
    });

    const inventory = await inventoryModel.create({
      pharmacyId: pharmacy._id,
      productId: product._id,
      price: 1200,
      stockQuantity: 10,
      alertThreshold: 5,
      isAvailable: true,
      lastUpdatedAt: new Date()
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: managerEmail, password: managerPassword })
      .expect(200);

    const token = loginResponse.body.accessToken as string;
    expect(token).toBeDefined();

    await request(app.getHttpServer())
      .patch(`/api/manager/products/${inventory._id.toString()}/stock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stockQuantity: 7, description: 'Inventory adjustment' })
      .expect(200);

    const movementsResponse = await request(app.getHttpServer())
      .get('/api/manager/products/movements')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(movementsResponse.body)).toBe(true);
    expect(movementsResponse.body.length).toBeGreaterThan(0);
    const movement = movementsResponse.body[0];
    expect(movement.productId).toBe(product._id.toString());
    expect(movement.type).toBe(StockMovementType.AJUSTEMENT);
  });
});
