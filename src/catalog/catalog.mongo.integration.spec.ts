import mongoose, { Model } from 'mongoose';
import {
  AccountStatus,
  FavoriteTargetType,
  NotificationChannel,
  NotificationType,
  Role,
  SupportedLanguage,
  StockMovementType
} from 'src/common/enums/domain.enums';
import { LocalizationService } from 'src/common/localization/localization.service';
import { MailerService } from 'src/common/services/mailer.service';
import { loadBackendEnv } from 'src/common/testing/load-env';
import { Favorite, FavoriteDocument, FavoriteSchema } from 'src/favorites/schemas/favorite.schema';
import { FavoritesService } from 'src/favorites/favorites.service';
import { Notification, NotificationDocument, NotificationSchema } from 'src/notifications/schemas/notification.schema';
import { NotificationsService } from 'src/notifications/notifications.service';
import { Pharmacy, PharmacyDocument, PharmacySchema } from 'src/pharmacies/schemas/pharmacy.schema';
import { PharmaciesService } from 'src/pharmacies/pharmacies.service';
import { User, UserDocument, UserSchema } from 'src/users/schemas/user.schema';
import { UsersService } from 'src/users/users.service';
import { PublicDrugsService } from 'src/public-drugs/public-drugs.service';
import {
  AdminMedicament,
  AdminMedicamentDocument,
  AdminMedicamentSchema
} from 'src/public-drugs/schemas/admin-medicament.schema';
import { CatalogService } from './catalog.service';
import { InventoryItem, InventoryItemDocument, InventoryItemSchema } from './schemas/inventory-item.schema';
import {
  ManagerCategory,
  ManagerCategoryDocument,
  ManagerCategorySchema
} from './schemas/manager-category.schema';
import { Product, ProductDocument, ProductSchema } from './schemas/product.schema';
import { StockMovement, StockMovementDocument, StockMovementSchema } from './schemas/stock-movement.schema';

loadBackendEnv();
const describeIfMongo = process.env.MONGODB_URI_TEST ? describe : describe.skip;
jest.setTimeout(20000);

describeIfMongo('CatalogService Mongo integration', () => {
  let userModel: Model<UserDocument>;
  let pharmacyModel: Model<PharmacyDocument>;
  let productModel: Model<ProductDocument>;
  let inventoryModel: Model<InventoryItemDocument>;
  let movementModel: Model<StockMovementDocument>;
  let managerCategoryModel: Model<ManagerCategoryDocument>;
  let favoriteModel: Model<FavoriteDocument>;
  let notificationModel: Model<NotificationDocument>;
  let adminMedicamentModel: Model<AdminMedicamentDocument>;
  let usersService: UsersService;
  let favoritesService: FavoritesService;
  let notificationsService: NotificationsService;
  let publicDrugsService: PublicDrugsService;
  let catalogService: CatalogService;
  let mailerService: { sendMail: jest.Mock };

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI_TEST!, {
        serverSelectionTimeoutMS: 5000
      });
    }

    userModel = mongoose.models.User || mongoose.model(User.name, UserSchema);
    pharmacyModel = mongoose.models.Pharmacy || mongoose.model(Pharmacy.name, PharmacySchema);
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
    favoriteModel =
      mongoose.models.Favorite || mongoose.model(Favorite.name, FavoriteSchema);
    notificationModel =
      mongoose.models.Notification ||
      mongoose.model(Notification.name, NotificationSchema);
    adminMedicamentModel =
      mongoose.models.AdminMedicament ||
      mongoose.model(AdminMedicament.name, AdminMedicamentSchema);

    const cloudinaryService = {
      uploadImage: jest.fn(),
      deleteImage: jest.fn(),
    } as never;

    usersService = new UsersService(userModel, cloudinaryService);
    favoritesService = new FavoritesService(favoriteModel);
    publicDrugsService = new PublicDrugsService(adminMedicamentModel);
    mailerService = { sendMail: jest.fn() };
    const pushSender = { send: jest.fn() } as never;
    notificationsService = new NotificationsService(
      notificationModel,
      usersService,
      mailerService as unknown as MailerService,
      new LocalizationService(),
      pushSender
    );
    catalogService = new CatalogService(
      new PharmaciesService({} as never, pharmacyModel, cloudinaryService),
      favoritesService,
      notificationsService,
      productModel,
      inventoryModel,
      movementModel,
      managerCategoryModel,
      publicDrugsService
    );
  });

  beforeEach(async () => {
    await Promise.all([
      userModel.deleteMany({}).exec(),
      pharmacyModel.deleteMany({}).exec(),
      productModel.deleteMany({}).exec(),
      inventoryModel.deleteMany({}).exec(),
      movementModel.deleteMany({}).exec(),
      managerCategoryModel.deleteMany({}).exec(),
      favoriteModel.deleteMany({}).exec(),
      notificationModel.deleteMany({}).exec(),
      adminMedicamentModel.deleteMany({}).exec()
    ]);
    mailerService.sendMail.mockClear();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it('persists a low-stock notification for the pharmacy manager', async () => {
    const manager = await userModel.create({
      firstName: 'Sarah',
      lastName: 'Manager',
      email: 'catalog-manager@example.com',
      passwordHash: 'hash',
      role: Role.PHARMACY_MANAGER,
      accountStatus: AccountStatus.VALIDE,
      isActive: true,
      country: 'Benin',
      preferences: {
        language: SupportedLanguage.FR,
        timezone: 'Africa/Porto-Novo',
        channels: [NotificationChannel.IN_APP],
        alertsEnabled: true
      }
    });

    await pharmacyModel.create({
      name: 'Pharmacie Stock',
      address: 'Cotonou',
      location: { type: 'Point', coordinates: [2.4, 6.3] },
      ifu: 'IFU-CATALOG-001',
      ownerId: manager._id,
      accountStatus: AccountStatus.VALIDE,
      operationalStatus: 'OUVERT'
    });

    const created = await catalogService.createManagerProduct(manager._id.toString(), {
      name: 'Paracetamol 500mg',
      scientificName: 'Paracetamol',
      category: 'Antalgique',
      price: 1500,
      stockQuantity: 10,
      alertThreshold: 3,
      isMedicine: true
    });

    await catalogService.updateManagerStock(
      manager._id.toString(),
      created.inventory._id.toString(),
      {
        stockQuantity: 2,
        alertThreshold: 3,
        description: 'vente intense'
      }
    );

    const notifications = await notificationModel.find({ userId: manager._id }).lean();

    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.type).toBe(NotificationType.STOCK_BAS);
    expect(notifications[0]?.message).toContain('Paracetamol 500mg');
  });

  it('lists stock movements for the manager pharmacy', async () => {
    const manager = await userModel.create({
      firstName: 'Maya',
      lastName: 'Stock',
      email: 'stock-manager@example.com',
      passwordHash: 'hash',
      role: Role.PHARMACY_MANAGER,
      accountStatus: AccountStatus.VALIDE,
      isActive: true,
      country: 'Benin',
      preferences: {
        language: SupportedLanguage.FR,
        timezone: 'Africa/Porto-Novo',
        channels: [NotificationChannel.IN_APP],
        alertsEnabled: true
      }
    });

    const pharmacy = await pharmacyModel.create({
      name: 'Pharmacie Stock',
      address: 'Cotonou',
      ifu: 'IFU-STOCK-001',
      ownerId: manager._id,
      accountStatus: AccountStatus.VALIDE,
      operationalStatus: 'OUVERT',
      location: { type: 'Point', coordinates: [2.4, 6.3] }
    });

    const product = await productModel.create({
      name: 'Paracetamol 500mg',
      scientificName: 'Paracetamol',
      isMedicine: true,
      category: 'Antalgique'
    });

    const inventory = await inventoryModel.create({
      pharmacyId: pharmacy._id,
      productId: product._id,
      price: 1500,
      stockQuantity: 10,
      alertThreshold: 3,
      isAvailable: true
    });

    await movementModel.create({
      inventoryItemId: inventory._id,
      pharmacyId: pharmacy._id,
      productId: product._id,
      type: StockMovementType.AJUSTEMENT,
      quantityDelta: 5,
      date: new Date()
    });

    const movements = await catalogService.listMovements(manager._id.toString());

    expect(movements).toHaveLength(1);
    expect(movements[0]?.productId?.toString()).toBe(product._id.toString());
  });

  it('persists a product-available notification for product watchers after restock', async () => {
    const manager = await userModel.create({
      firstName: 'Sarah',
      lastName: 'Manager',
      email: 'catalog-restock-manager@example.com',
      passwordHash: 'hash',
      role: Role.PHARMACY_MANAGER,
      accountStatus: AccountStatus.VALIDE,
      isActive: true,
      country: 'Benin',
      preferences: {
        language: SupportedLanguage.FR,
        timezone: 'Africa/Porto-Novo',
        channels: [NotificationChannel.IN_APP],
        alertsEnabled: true
      }
    });
    const patient = await userModel.create({
      firstName: 'Jean',
      lastName: 'Patient',
      email: 'catalog-watcher@example.com',
      passwordHash: 'hash',
      role: Role.PATIENT,
      accountStatus: AccountStatus.VALIDE,
      isActive: true,
      country: 'Benin',
      preferences: {
        language: SupportedLanguage.FR,
        timezone: 'Africa/Porto-Novo',
        channels: [NotificationChannel.IN_APP],
        alertsEnabled: true
      }
    });

    await pharmacyModel.create({
      name: 'Pharmacie Restock',
      address: 'Porto-Novo',
      location: { type: 'Point', coordinates: [2.6, 6.5] },
      ifu: 'IFU-CATALOG-002',
      ownerId: manager._id,
      accountStatus: AccountStatus.VALIDE,
      operationalStatus: 'OUVERT'
    });

    const created = await catalogService.createManagerProduct(manager._id.toString(), {
      name: 'Ibuprofene 400mg',
      scientificName: 'Ibuprofene',
      category: 'Anti-inflammatoire',
      price: 2200,
      stockQuantity: 0,
      alertThreshold: 2,
      isMedicine: true
    });

    await favoriteModel.create({
      userId: patient._id,
      targetType: FavoriteTargetType.PRODUCT,
      productId: created.product._id
    });

    await catalogService.updateManagerStock(
      manager._id.toString(),
      created.inventory._id.toString(),
      {
        stockQuantity: 5,
        alertThreshold: 2,
        description: 'réapprovisionnement'
      }
    );

    const notifications = await notificationModel.find({ userId: patient._id }).lean();

    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.type).toBe(NotificationType.PRODUIT_DISPONIBLE);
    expect(notifications[0]?.message).toContain('Ibuprofene 400mg');
    expect(notifications[0]?.message).toContain('Pharmacie Restock');
  });

  it('manages manager categories and propagates rename/delete to product category', async () => {
    const manager = await userModel.create({
      firstName: 'Nadia',
      lastName: 'Owner',
      email: 'catalog-category-owner@example.com',
      passwordHash: 'hash',
      role: Role.PHARMACY_MANAGER,
      accountStatus: AccountStatus.VALIDE,
      isActive: true,
      country: 'Benin',
      preferences: {
        language: SupportedLanguage.FR,
        timezone: 'Africa/Porto-Novo',
        channels: [NotificationChannel.IN_APP],
        alertsEnabled: true
      }
    });

    await pharmacyModel.create({
      name: 'Pharmacie Cat',
      address: 'Cotonou',
      location: { type: 'Point', coordinates: [2.4, 6.3] },
      ifu: 'IFU-CAT-001',
      ownerId: manager._id,
      accountStatus: AccountStatus.VALIDE,
      operationalStatus: 'OUVERT'
    });

    const created = await catalogService.createManagerProduct(manager._id.toString(), {
      name: 'Paracetamol 500mg',
      scientificName: 'Paracetamol',
      category: 'Antalgique',
      price: 1500,
      stockQuantity: 10,
      alertThreshold: 3,
      isMedicine: true
    });

    const categories = await catalogService.listManagerCategories(manager._id.toString());
    const target = categories.find((entry) => entry.name === 'Antalgique');
    expect(target?._id).toBeDefined();
    expect(target?.productCount).toBe(1);

    await catalogService.updateManagerCategory(
      manager._id.toString(),
      target!._id,
      'Analgésiques'
    );

    const productAfterRename = await productModel.findById(created.product._id).lean().exec();
    expect(productAfterRename?.category).toBe('Analgésiques');

    await catalogService.deleteManagerCategory(manager._id.toString(), target!._id);

    const productAfterDelete = await productModel.findById(created.product._id).lean().exec();
    expect(productAfterDelete?.category).toBeUndefined();
  });

  it('syncs manager products into admin medicaments catalog', async () => {
    const manager = await userModel.create({
      firstName: 'Mina',
      lastName: 'Sync',
      email: 'catalog-sync-manager@example.com',
      passwordHash: 'hash',
      role: Role.PHARMACY_MANAGER,
      accountStatus: AccountStatus.VALIDE,
      isActive: true,
      country: 'Benin',
      preferences: {
        language: SupportedLanguage.FR,
        timezone: 'Africa/Porto-Novo',
        channels: [NotificationChannel.IN_APP],
        alertsEnabled: true
      }
    });

    await pharmacyModel.create({
      name: 'Pharmacie Sync',
      address: 'Cotonou',
      location: { type: 'Point', coordinates: [2.4, 6.3] },
      ifu: 'IFU-SYNC-001',
      ownerId: manager._id,
      accountStatus: AccountStatus.VALIDE,
      operationalStatus: 'OUVERT'
    });

    const created = await catalogService.createManagerProduct(manager._id.toString(), {
      name: 'Cetirizine 10mg',
      scientificName: 'Cetirizine',
      category: 'Allergie',
      price: 1800,
      stockQuantity: 5,
      alertThreshold: 2,
      isMedicine: true
    });

    const synced = await adminMedicamentModel
      .findOne({ externalProductId: created.product._id.toString() })
      .lean()
      .exec();

    expect(synced?.name).toBe('Cetirizine 10mg');
    expect(synced?.source).toBe('Catalogue pharmacies');
    expect(synced?.form).toBe('Allergie');
    expect(synced?.laboratory).toBe('Cetirizine');

    await catalogService.updateManagerProduct(
      manager._id.toString(),
      created.inventory._id.toString(),
      { name: 'Cetirizine 10mg (maj)' }
    );

    const syncedAfterUpdate = await adminMedicamentModel
      .findOne({ externalProductId: created.product._id.toString() })
      .lean()
      .exec();

    expect(syncedAfterUpdate?.name).toBe('Cetirizine 10mg (maj)');
  });
});
