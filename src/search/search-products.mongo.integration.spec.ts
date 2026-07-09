import mongoose, { Model, Types } from 'mongoose';
import { AccountStatus } from 'src/common/enums/domain.enums';
import { loadBackendEnv } from 'src/common/testing/load-env';
import { CatalogService } from 'src/catalog/catalog.service';
import { InventoryItem, InventoryItemDocument, InventoryItemSchema } from 'src/catalog/schemas/inventory-item.schema';
import {
  ManagerCategory,
  ManagerCategoryDocument,
  ManagerCategorySchema
} from 'src/catalog/schemas/manager-category.schema';
import { Product, ProductDocument, ProductSchema } from 'src/catalog/schemas/product.schema';
import { StockMovement, StockMovementDocument, StockMovementSchema } from 'src/catalog/schemas/stock-movement.schema';
import { PharmaciesService } from 'src/pharmacies/pharmacies.service';
import { Pharmacy, PharmacyDocument, PharmacySchema } from 'src/pharmacies/schemas/pharmacy.schema';
import { SchedulesService } from 'src/schedules/schedules.service';
import { Schedule, ScheduleDocument, ScheduleSchema } from 'src/schedules/schemas/schedule.schema';
import { SearchService } from './search.service';

loadBackendEnv();
const describeIfMongo = process.env.MONGODB_URI_TEST ? describe : describe.skip;
jest.setTimeout(20000);

describeIfMongo('SearchService products Mongo integration', () => {
  let pharmacyModel: Model<PharmacyDocument>;
  let scheduleModel: Model<ScheduleDocument>;
  let productModel: Model<ProductDocument>;
  let inventoryModel: Model<InventoryItemDocument>;
  let movementModel: Model<StockMovementDocument>;
  let managerCategoryModel: Model<ManagerCategoryDocument>;
  let pharmaciesService: PharmaciesService;
  let schedulesService: SchedulesService;
  let catalogService: CatalogService;
  let searchService: SearchService;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI_TEST!, {
        serverSelectionTimeoutMS: 5000
      });
    }

    pharmacyModel = mongoose.models.Pharmacy || mongoose.model(Pharmacy.name, PharmacySchema);
    scheduleModel = mongoose.models.Schedule || mongoose.model(Schedule.name, ScheduleSchema);
    productModel = mongoose.models.Product || mongoose.model(Product.name, ProductSchema);
    inventoryModel =
      mongoose.models.InventoryItem ||
      mongoose.model(InventoryItem.name, InventoryItemSchema);
    movementModel =
      mongoose.models.StockMovement ||
      mongoose.model(StockMovement.name, StockMovementSchema);
    managerCategoryModel =
      mongoose.models.ManagerCategory ||
      mongoose.model(ManagerCategory.name, ManagerCategorySchema);

    const cloudinaryService = {
      uploadImage: jest.fn(),
      deleteImage: jest.fn(),
    } as never;

    pharmaciesService = new PharmaciesService({} as never, pharmacyModel, cloudinaryService);
    schedulesService = new SchedulesService({} as never, scheduleModel);
    catalogService = new CatalogService(
      {} as never,
      {} as never,
      {} as never,
      productModel,
      inventoryModel,
      movementModel,
      managerCategoryModel
    );
    searchService = new SearchService(
      catalogService,
      { geocodeAddress: jest.fn() } as never,
      pharmaciesService,
      schedulesService
    );

    await pharmacyModel.syncIndexes();
  });

  beforeEach(async () => {
    await Promise.all([
      pharmacyModel.deleteMany({}).exec(),
      scheduleModel.deleteMany({}).exec(),
      productModel.deleteMany({}).exec(),
      inventoryModel.deleteMany({}).exec(),
      movementModel.deleteMany({}).exec(),
      managerCategoryModel.deleteMany({}).exec()
    ]);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it('filters by distance, availability and openNow when searching products', async () => {
    const dayOfWeek = new Date().getUTCDay();
    const ownerId = new Types.ObjectId();
    const product = await productModel.create({
      name: 'Paracetamol 500mg',
      scientificName: 'Paracetamol',
      category: 'Antalgique',
      isMedicine: true
    });

    const nearOpen = await pharmacyModel.create({
      name: 'Pharmacie Proche',
      address: 'Cotonou Centre',
      location: { type: 'Point', coordinates: [2.4, 6.3] },
      ifu: 'IFU-SEARCH-NEAR-OPEN',
      ownerId,
      accountStatus: AccountStatus.VALIDE,
      operationalStatus: 'FERME'
    });
    const nearClosed = await pharmacyModel.create({
      name: 'Pharmacie Proche Fermee',
      address: 'Cotonou',
      location: { type: 'Point', coordinates: [2.401, 6.301] },
      ifu: 'IFU-SEARCH-NEAR-CLOSED',
      ownerId: new Types.ObjectId(),
      accountStatus: AccountStatus.VALIDE,
      operationalStatus: 'OUVERT'
    });
    const farOpen = await pharmacyModel.create({
      name: 'Pharmacie Lointaine',
      address: 'Porto-Novo',
      location: { type: 'Point', coordinates: [3.5, 7.5] },
      ifu: 'IFU-SEARCH-FAR-OPEN',
      ownerId: new Types.ObjectId(),
      accountStatus: AccountStatus.VALIDE,
      operationalStatus: 'OUVERT'
    });
    const nearNoStock = await pharmacyModel.create({
      name: 'Pharmacie Proche Rupture',
      address: 'Cotonou',
      location: { type: 'Point', coordinates: [2.402, 6.302] },
      ifu: 'IFU-SEARCH-NEAR-NOSTOCK',
      ownerId: new Types.ObjectId(),
      accountStatus: AccountStatus.VALIDE,
      operationalStatus: 'OUVERT'
    });

    await scheduleModel.create({
      pharmacyId: nearOpen._id,
      weekly: [{ dayOfWeek, openTime: '00:00', closeTime: '23:59', isClosed: false, onDuty: false }],
      exceptions: []
    });
    await scheduleModel.create({
      pharmacyId: nearClosed._id,
      weekly: [{ dayOfWeek, isClosed: true, onDuty: false }],
      exceptions: []
    });
    await scheduleModel.create({
      pharmacyId: farOpen._id,
      weekly: [{ dayOfWeek, openTime: '00:00', closeTime: '23:59', isClosed: false, onDuty: false }],
      exceptions: []
    });
    await scheduleModel.create({
      pharmacyId: nearNoStock._id,
      weekly: [{ dayOfWeek, openTime: '00:00', closeTime: '23:59', isClosed: false, onDuty: false }],
      exceptions: []
    });

    await inventoryModel.create({
      pharmacyId: nearOpen._id,
      productId: product._id,
      price: 1500,
      stockQuantity: 10,
      alertThreshold: 3,
      isAvailable: true
    });
    await inventoryModel.create({
      pharmacyId: nearClosed._id,
      productId: product._id,
      price: 1600,
      stockQuantity: 8,
      alertThreshold: 3,
      isAvailable: true
    });
    await inventoryModel.create({
      pharmacyId: farOpen._id,
      productId: product._id,
      price: 1700,
      stockQuantity: 6,
      alertThreshold: 3,
      isAvailable: true
    });
    await inventoryModel.create({
      pharmacyId: nearNoStock._id,
      productId: product._id,
      price: 1800,
      stockQuantity: 0,
      alertThreshold: 3,
      isAvailable: false
    });

    const results = await searchService.searchProducts({
      q: '',
      lat: 6.3,
      lng: 2.4,
      radiusKm: 5,
      openNow: true
    });

    expect(results).toHaveLength(1);
    expect((results[0] as { pharmacyId?: { name?: string } })?.pharmacyId?.name).toBe(
      'Pharmacie Proche'
    );
    expect(results[0]?.isAvailable).toBe(true);
  });

  it('filters products by category', async () => {
    const ownerId = new Types.ObjectId();
    const pharmacy = await pharmacyModel.create({
      name: 'Pharmacie Cat',
      address: 'Cotonou',
      location: { type: 'Point', coordinates: [2.4, 6.3] },
      ifu: 'IFU-SEARCH-CAT',
      ownerId,
      accountStatus: AccountStatus.VALIDE,
      operationalStatus: 'OUVERT'
    });

    const productA = await productModel.create({
      name: 'Paracetamol 500mg',
      scientificName: 'Paracetamol',
      category: 'Antalgique',
      isMedicine: true
    });
    const productB = await productModel.create({
      name: 'Amoxicilline 500mg',
      scientificName: 'Amoxicilline',
      category: 'Antibiotique',
      isMedicine: true
    });

    await inventoryModel.create({
      pharmacyId: pharmacy._id,
      productId: productA._id,
      price: 1200,
      stockQuantity: 10,
      alertThreshold: 3,
      isAvailable: true
    });
    await inventoryModel.create({
      pharmacyId: pharmacy._id,
      productId: productB._id,
      price: 2200,
      stockQuantity: 8,
      alertThreshold: 3,
      isAvailable: true
    });

    const results = await searchService.searchProducts({
      q: 'Paracetamol',
      category: 'Antalgique',
      openNow: false
    });

    expect(results).toHaveLength(1);
    expect(
      (results[0] as { productId?: { category?: string } })?.productId?.category
    ).toBe('Antalgique');
  });

  it('supports fuzzy product search when text search misses', async () => {
    const ownerId = new Types.ObjectId();
    const pharmacy = await pharmacyModel.create({
      name: 'Pharmacie Fuzzy',
      address: 'Cotonou',
      location: { type: 'Point', coordinates: [2.4, 6.3] },
      ifu: 'IFU-SEARCH-FUZZY',
      ownerId,
      accountStatus: AccountStatus.VALIDE,
      operationalStatus: 'OUVERT'
    });

    const product = await productModel.create({
      name: 'Paracetamol 500mg',
      scientificName: 'Paracetamol',
      category: 'Antalgique',
      isMedicine: true
    });

    await inventoryModel.create({
      pharmacyId: pharmacy._id,
      productId: product._id,
      price: 1500,
      stockQuantity: 10,
      alertThreshold: 3,
      isAvailable: true
    });

    const results = await searchService.searchProducts({
      q: 'Prctmol',
      openNow: false
    });

    expect(results).toHaveLength(1);
    expect((results[0] as { productId?: { name?: string } })?.productId?.name).toBe(
      'Paracetamol 500mg'
    );
  });

  it('returns real openNow status and avoids unrelated products for a precise query', async () => {
    const dayOfWeek = new Date().getUTCDay();
    const ownerId = new Types.ObjectId();
    const pharmacy = await pharmacyModel.create({
      name: 'Pharmacie Precision',
      address: 'Cotonou',
      location: { type: 'Point', coordinates: [2.4, 6.3] },
      ifu: 'IFU-SEARCH-PRECISION',
      ownerId,
      accountStatus: AccountStatus.VALIDE,
      operationalStatus: 'OUVERT'
    });

    await scheduleModel.create({
      pharmacyId: pharmacy._id,
      weekly: [{ dayOfWeek, openTime: '00:00', closeTime: '23:59', isClosed: false, onDuty: false }],
      exceptions: []
    });

    const amoxicillin = await productModel.create({
      name: 'Amoxicilline 500mg',
      scientificName: 'Amoxicillin',
      category: 'Antibiotique',
      isMedicine: true
    });
    const paracetamol = await productModel.create({
      name: 'Paracetamol 500mg',
      scientificName: 'Paracetamol',
      category: 'Antalgique',
      isMedicine: true
    });

    await inventoryModel.create({
      pharmacyId: pharmacy._id,
      productId: amoxicillin._id,
      price: 1200,
      stockQuantity: 10,
      alertThreshold: 3,
      isAvailable: true
    });
    await inventoryModel.create({
      pharmacyId: pharmacy._id,
      productId: paracetamol._id,
      price: 900,
      stockQuantity: 10,
      alertThreshold: 3,
      isAvailable: true
    });

    const results = await searchService.searchProducts({
      q: 'Amoxicilline 500mg',
      openNow: false
    });

    expect(results).toHaveLength(1);
    expect((results[0] as { productId?: { name?: string } })?.productId?.name).toBe(
      'Amoxicilline 500mg'
    );
    expect((results[0] as { pharmacyId?: { openNow?: boolean } })?.pharmacyId?.openNow).toBe(
      true
    );
  });
});
