import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection, Model } from 'mongoose';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { HttpProblemDetailsFilter } from 'src/common/filters/http-problem-details.filter';
import { LocalizationService } from 'src/common/localization/localization.service';
import { loadBackendEnv } from 'src/common/testing/load-env';
import { Product, ProductDocument } from 'src/catalog/schemas/product.schema';

loadBackendEnv();

jest.setTimeout(30000);

describe('Categories flow (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let productModel: Model<ProductDocument>;

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
    productModel = app.get<Model<ProductDocument>>(getModelToken(Product.name));

    await productModel.syncIndexes();
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

  it('lists distinct product categories and supports filtering', async () => {
    await productModel.create({
      name: 'Paracetamol 500mg',
      scientificName: 'Paracetamol',
      category: 'Antalgique',
      isMedicine: true
    });
    await productModel.create({
      name: 'Ibuprofen 400mg',
      scientificName: 'Ibuprofen',
      category: 'Anti-inflammatoire',
      isMedicine: true
    });
    await productModel.create({
      name: 'Amoxicilline 500mg',
      scientificName: 'Amoxicilline',
      category: 'Antibiotique',
      isMedicine: true
    });

    const listResponse = await request(app.getHttpServer())
      .get('/api/search/categories')
      .expect(200);

    expect(Array.isArray(listResponse.body)).toBe(true);
    expect(listResponse.body).toEqual(
      expect.arrayContaining(['Antalgique', 'Anti-inflammatoire', 'Antibiotique'])
    );

    const filteredResponse = await request(app.getHttpServer())
      .get('/api/search/categories?q=anti&limit=2')
      .expect(200);

    expect(filteredResponse.body.length).toBeLessThanOrEqual(2);
    expect(
      filteredResponse.body.every((value: string) =>
        value.toLowerCase().includes('anti')
      )
    ).toBe(true);
  });
});
