import mongoose, { Model } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import {
  AccountStatus,
  NotificationChannel,
  NotificationType,
  Role,
  SupportedLanguage,
  ValidationStatus
} from '../common/enums/domain.enums';
import { LocalizationService } from '../common/localization/localization.service';
import { loadBackendEnv } from '../common/testing/load-env';
import { Notification, NotificationDocument, NotificationSchema } from '../notifications/schemas/notification.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { PharmaciesService } from '../pharmacies/pharmacies.service';
import { PharmacyValidationsService } from '../pharmacies/pharmacy-validations.service';
import { PharmacyValidation, PharmacyValidationDocument, PharmacyValidationSchema } from '../pharmacies/schemas/pharmacy-validation.schema';
import { Pharmacy, PharmacyDocument, PharmacySchema } from '../pharmacies/schemas/pharmacy.schema';
import { InventoryItem, InventoryItemDocument, InventoryItemSchema } from '../catalog/schemas/inventory-item.schema';
import { Product, ProductDocument, ProductSchema } from '../catalog/schemas/product.schema';
import { AdminMedicament, AdminMedicamentDocument, AdminMedicamentSchema } from '../public-drugs/schemas/admin-medicament.schema';
import { PublicDrugsService } from '../public-drugs/public-drugs.service';
import { User, UserDocument, UserSchema } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { AdminService } from './admin.service';
import { IntegrationValidationService } from './integration-validation.service';
import { Suspension, SuspensionDocument, SuspensionSchema } from './schemas/suspension.schema';

loadBackendEnv();
const describeIfMongo = process.env.MONGODB_URI_TEST ? describe : describe.skip;
jest.setTimeout(20000);

describeIfMongo('AdminService Mongo integration', () => {
  let userModel: Model<UserDocument>;
  let pharmacyModel: Model<PharmacyDocument>;
  let validationModel: Model<PharmacyValidationDocument>;
  let inventoryModel: Model<InventoryItemDocument>;
  let productModel: Model<ProductDocument>;
  let notificationModel: Model<NotificationDocument>;
  let suspensionModel: Model<SuspensionDocument>;
  let adminMedicamentModel: Model<AdminMedicamentDocument>;
  let usersService: UsersService;
  let pharmaciesService: PharmaciesService;
  let validationsService: PharmacyValidationsService;
  let notificationsService: NotificationsService;
  let publicDrugsService: PublicDrugsService;
  let adminService: AdminService;
  let mailerService: { sendMail: jest.Mock };

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI_TEST!, {
        serverSelectionTimeoutMS: 5000
      });
    }

    userModel = mongoose.models.User || mongoose.model(User.name, UserSchema);
    pharmacyModel = mongoose.models.Pharmacy || mongoose.model(Pharmacy.name, PharmacySchema);
    validationModel =
      mongoose.models.PharmacyValidation ||
      mongoose.model(PharmacyValidation.name, PharmacyValidationSchema);
    inventoryModel =
      mongoose.models.InventoryItem ||
      mongoose.model(InventoryItem.name, InventoryItemSchema);
    productModel =
      mongoose.models.Product || mongoose.model(Product.name, ProductSchema);
    notificationModel =
      mongoose.models.Notification ||
      mongoose.model(Notification.name, NotificationSchema);
    suspensionModel =
      mongoose.models.Suspension || mongoose.model(Suspension.name, SuspensionSchema);
    adminMedicamentModel =
      mongoose.models.AdminMedicament ||
      mongoose.model(AdminMedicament.name, AdminMedicamentSchema);

    const cloudinaryService = {
      uploadImage: jest.fn(),
      deleteImage: jest.fn(),
    } as never;

    usersService = new UsersService(userModel, cloudinaryService);
    pharmaciesService = new PharmaciesService({} as never, pharmacyModel, cloudinaryService);
    validationsService = new PharmacyValidationsService(validationModel);
    publicDrugsService = new PublicDrugsService(adminMedicamentModel);
    mailerService = { sendMail: jest.fn() };
    notificationsService = new NotificationsService(
      notificationModel,
      usersService,
      mailerService as never,
      new LocalizationService(),
      { send: jest.fn(async () => undefined) }
    );
    adminService = new AdminService(
      { list: jest.fn() } as unknown as AuditService,
      usersService,
      pharmaciesService,
      validationsService,
      notificationsService,
      publicDrugsService,
      new IntegrationValidationService({ get: jest.fn() } as never),
      userModel,
      suspensionModel,
      inventoryModel,
      productModel
    );
  });

  beforeEach(async () => {
    await Promise.all([
      userModel.deleteMany({}).exec(),
      pharmacyModel.deleteMany({}).exec(),
      validationModel.deleteMany({}).exec(),
      inventoryModel.deleteMany({}).exec(),
      productModel.deleteMany({}).exec(),
      notificationModel.deleteMany({}).exec(),
      suspensionModel.deleteMany({}).exec(),
      adminMedicamentModel.deleteMany({}).exec()
    ]);
    mailerService.sendMail.mockClear();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it('approves a pharmacy validation and persists the notification', async () => {
    const admin = await userModel.create({
      firstName: 'Admin',
      lastName: 'Root',
      email: 'admin.mongo@example.com',
      passwordHash: 'hash',
      role: Role.ADMIN,
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
    const manager = await userModel.create({
      firstName: 'Sarah',
      lastName: 'Manager',
      email: 'manager.mongo@example.com',
      passwordHash: 'hash',
      role: Role.PHARMACY_MANAGER,
      accountStatus: AccountStatus.EN_ATTENTE,
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
      name: 'Pharmacie Test',
      address: 'Cotonou',
      location: { type: 'Point', coordinates: [2.4, 6.3] },
      ifu: 'IFU-MONGO-001',
      ownerId: manager._id,
      accountStatus: AccountStatus.EN_ATTENTE,
      operationalStatus: 'FERME'
    });
    const validation = await validationModel.create({
      pharmacyId: pharmacy._id,
      requestedByUserId: manager._id,
      status: ValidationStatus.EN_ATTENTE,
      documents: []
    });

    await adminService.approveValidation(validation._id.toString(), admin._id.toString(), 'ok');

    const updatedManager = await userModel.findById(manager._id).lean();
    const updatedPharmacy = await pharmacyModel.findById(pharmacy._id).lean();
    const updatedValidation = await validationModel.findById(validation._id).lean();
    const notifications = await notificationModel.find({ userId: manager._id }).lean();

    expect(updatedManager?.accountStatus).toBe(AccountStatus.VALIDE);
    expect(updatedManager?.emailVerifiedAt).toBeTruthy();
    expect(updatedPharmacy?.accountStatus).toBe(AccountStatus.VALIDE);
    expect(updatedValidation?.status).toBe(ValidationStatus.VALIDE);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.type).toBe(NotificationType.VALIDATION_COMPTE);
    expect(notifications[0]?.title).toBe('Compte validé');
  });

  it('rejects a pharmacy validation and persists the rejection notification', async () => {
    const admin = await userModel.create({
      firstName: 'Admin',
      lastName: 'Root',
      email: 'admin.reject@example.com',
      passwordHash: 'hash',
      role: Role.ADMIN,
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
    const manager = await userModel.create({
      firstName: 'Sarah',
      lastName: 'Manager',
      email: 'manager.reject@example.com',
      passwordHash: 'hash',
      role: Role.PHARMACY_MANAGER,
      accountStatus: AccountStatus.EN_ATTENTE,
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
      name: 'Pharmacie Rejetee',
      address: 'Cotonou',
      location: { type: 'Point', coordinates: [2.4, 6.3] },
      ifu: 'IFU-MONGO-REJECT',
      ownerId: manager._id,
      accountStatus: AccountStatus.EN_ATTENTE,
      operationalStatus: 'FERME'
    });
    const validation = await validationModel.create({
      pharmacyId: pharmacy._id,
      requestedByUserId: manager._id,
      status: ValidationStatus.EN_ATTENTE,
      documents: []
    });

    await adminService.rejectValidation(validation._id.toString(), admin._id.toString(), 'IFU invalide');

    const updatedManager = await userModel.findById(manager._id).lean();
    const updatedPharmacy = await pharmacyModel.findById(pharmacy._id).lean();
    const updatedValidation = await validationModel.findById(validation._id).lean();
    const notifications = await notificationModel.find({ userId: manager._id }).lean();

    expect(updatedManager?.accountStatus).toBe(AccountStatus.SUSPENDU);
    expect(updatedPharmacy?.accountStatus).toBe(AccountStatus.SUSPENDU);
    expect(updatedValidation?.status).toBe(ValidationStatus.REJETE);
    expect(updatedValidation?.comment).toBe('IFU invalide');
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.type).toBe(NotificationType.VALIDATION_COMPTE);
    expect(notifications[0]?.message).toContain('IFU invalide');
  });

  it('suspends a pharmacy manager and persists suspension plus notification', async () => {
    const admin = await userModel.create({
      firstName: 'Admin',
      lastName: 'Root',
      email: 'admin.suspend@example.com',
      passwordHash: 'hash',
      role: Role.ADMIN,
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
    const manager = await userModel.create({
      firstName: 'Sarah',
      lastName: 'Manager',
      email: 'manager.suspend@example.com',
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
      name: 'Pharmacie Suspendue',
      address: 'Porto-Novo',
      location: { type: 'Point', coordinates: [2.6, 6.5] },
      ifu: 'IFU-MONGO-002',
      ownerId: manager._id,
      accountStatus: AccountStatus.VALIDE,
      operationalStatus: 'OUVERT'
    });

    await adminService.suspendAccount(manager._id.toString(), admin._id.toString(), {
      reason: 'Documents manquants'
    });

    const updatedManager = await userModel.findById(manager._id).lean();
    const updatedPharmacy = await pharmacyModel.findById(pharmacy._id).lean();
    const suspensions = await suspensionModel.find({ targetUserId: manager._id }).lean();
    const notifications = await notificationModel.find({ userId: manager._id }).lean();

    expect(updatedManager?.accountStatus).toBe(AccountStatus.SUSPENDU);
    expect(updatedManager?.isActive).toBe(false);
    expect(updatedPharmacy?.accountStatus).toBe(AccountStatus.SUSPENDU);
    expect(suspensions).toHaveLength(1);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.type).toBe(NotificationType.SUSPENSION);
    expect(notifications[0]?.message).toContain('Documents manquants');
  });

  it('unsuspends a pharmacy manager and closes active suspensions', async () => {
    const manager = await userModel.create({
      firstName: 'Sarah',
      lastName: 'Manager',
      email: 'manager.unsuspend@example.com',
      passwordHash: 'hash',
      role: Role.PHARMACY_MANAGER,
      accountStatus: AccountStatus.SUSPENDU,
      isActive: false,
      country: 'Benin',
      preferences: {
        language: SupportedLanguage.FR,
        timezone: 'Africa/Porto-Novo',
        channels: [NotificationChannel.IN_APP],
        alertsEnabled: true
      }
    });
    const pharmacy = await pharmacyModel.create({
      name: 'Pharmacie Reactivee',
      address: 'Porto-Novo',
      location: { type: 'Point', coordinates: [2.6, 6.5] },
      ifu: 'IFU-MONGO-003',
      ownerId: manager._id,
      accountStatus: AccountStatus.SUSPENDU,
      operationalStatus: 'FERME'
    });
    await suspensionModel.create({
      targetUserId: manager._id,
      targetPharmacyId: pharmacy._id,
      reason: 'Controle manuel',
      startDate: new Date(),
      isActive: true,
      createdByAdminId: new mongoose.Types.ObjectId()
    });

    await adminService.unsuspendAccount(manager._id.toString());

    const updatedManager = await userModel.findById(manager._id).lean();
    const updatedPharmacy = await pharmacyModel.findById(pharmacy._id).lean();
    const suspensions = await suspensionModel.find({ targetUserId: manager._id }).lean();
    const notifications = await notificationModel.find({ userId: manager._id }).lean();

    expect(updatedManager?.accountStatus).toBe(AccountStatus.VALIDE);
    expect(updatedManager?.isActive).toBe(true);
    expect(updatedPharmacy?.accountStatus).toBe(AccountStatus.VALIDE);
    expect(suspensions).toHaveLength(1);
    expect(suspensions[0]?.isActive).toBe(false);
    expect(suspensions[0]?.endDate).toBeTruthy();
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.type).toBe(NotificationType.SUSPENSION);
    expect(notifications[0]?.title).toBe('Compte réactivé');
  });

  it('creates a patient user from admin flow', async () => {
    const result = await adminService.createUser({
      firstName: 'Aicha',
      lastName: 'Patient',
      email: 'patient.created@example.com',
      password: 'StrongPass1!',
      country: 'Benin',
      phoneNumber: '+2290102030405',
      role: Role.PATIENT
    });

    const created = await userModel.findOne({ email: 'patient.created@example.com' }).lean();

    expect(result.success).toBe(true);
    expect(created).toBeTruthy();
    expect(created?.firstName).toBe('Aicha');
    expect(created?.lastName).toBe('Patient');
    expect(created?.role).toBe(Role.PATIENT);
    expect(created?.accountStatus).toBe(AccountStatus.VALIDE);
    expect(created?.isActive).toBe(true);
    expect(created?.emailVerifiedAt).toBeTruthy();
    expect(created?.passwordHash).toBeTruthy();
    expect(created?.passwordHash).not.toBe('StrongPass1!');
  });

  it('rejects user creation when email already exists', async () => {
    await userModel.create({
      firstName: 'Existing',
      lastName: 'User',
      email: 'existing.admin.create@example.com',
      passwordHash: 'hash',
      role: Role.PATIENT,
      accountStatus: AccountStatus.VALIDE,
      isActive: true,
      country: 'Benin'
    });

    await expect(
      adminService.createUser({
        firstName: 'Another',
        lastName: 'User',
        email: 'existing.admin.create@example.com',
        password: 'StrongPass1!',
        country: 'Benin'
      })
    ).rejects.toThrow('Email already registered');
  });

  it('updates and deletes a patient user from admin flow', async () => {
    const created = await adminService.createUser({
      firstName: 'Moussa',
      lastName: 'User',
      email: 'user.update.delete@example.com',
      password: 'StrongPass1!',
      country: 'Benin',
      role: Role.PATIENT
    });

    const updated = await adminService.updateUser(created.user._id.toString(), {
      firstName: 'Moussa Updated',
      phoneNumber: '+2290100000001',
      country: 'Togo'
    });

    expect(updated.firstName).toBe('Moussa Updated');
    expect(updated.phoneNumber).toBe('+2290100000001');
    expect(updated.country).toBe('Togo');

    const deletion = await adminService.deleteUser(created.user._id.toString());
    expect(deletion.success).toBe(true);

    const deleted = await userModel.findById(created.user._id).lean();
    expect(deleted).toBeNull();
  });

  it('creates a pharmacy with its manager from admin flow', async () => {
    const result = await adminService.createPharmacy({
      managerFirstName: 'Jean',
      managerLastName: 'Manager',
      managerEmail: 'manager.created@example.com',
      password: 'StrongPass1!',
      country: 'Benin',
      pharmacyName: 'Pharmacie Admin Create',
      pharmacyAddress: '123 Avenue des Tests, Cotonou',
      ifu: 'IFU-ADMIN-CR-001',
      latitude: 6.37,
      longitude: 2.39,
      description: 'Créée par un admin'
    });

    const manager = await userModel.findOne({ email: 'manager.created@example.com' }).lean();
    const pharmacy = await pharmacyModel.findOne({ ifu: 'IFU-ADMIN-CR-001' }).lean();

    expect(result.message).toBe('Pharmacy created by admin');
    expect(manager).toBeTruthy();
    expect(manager?.role).toBe(Role.PHARMACY_MANAGER);
    expect(manager?.accountStatus).toBe(AccountStatus.VALIDE);
    expect(manager?.isActive).toBe(true);
    expect(manager?.emailVerifiedAt).toBeTruthy();
    expect(manager?.passwordHash).toBeTruthy();
    expect(manager?.passwordHash).not.toBe('StrongPass1!');

    expect(pharmacy).toBeTruthy();
    expect(pharmacy?.name).toBe('Pharmacie Admin Create');
    expect(pharmacy?.accountStatus).toBe(AccountStatus.VALIDE);
    expect(pharmacy?.validationDate).toBeTruthy();
    expect(pharmacy?.ownerId?.toString()).toBe(manager?._id.toString());
  });

  it('rejects pharmacy creation when IFU already exists', async () => {
    const manager = await userModel.create({
      firstName: 'Owner',
      lastName: 'Existing',
      email: 'owner.existing.ifu@example.com',
      passwordHash: 'hash',
      role: Role.PHARMACY_MANAGER,
      accountStatus: AccountStatus.VALIDE,
      isActive: true,
      country: 'Benin'
    });

    await pharmacyModel.create({
      name: 'Pharmacie Existing IFU',
      address: 'Cotonou',
      location: { type: 'Point', coordinates: [2.4, 6.3] },
      ifu: 'IFU-ALREADY-USED',
      ownerId: manager._id,
      accountStatus: AccountStatus.VALIDE,
      operationalStatus: 'OUVERT'
    });

    await expect(
      adminService.createPharmacy({
        managerFirstName: 'Sarah',
        managerLastName: 'New',
        managerEmail: 'new.manager@example.com',
        password: 'StrongPass1!',
        country: 'Benin',
        pharmacyName: 'Pharmacie New',
        pharmacyAddress: 'Rue Nouvelle, Cotonou',
        ifu: 'IFU-ALREADY-USED',
        latitude: 6.36,
        longitude: 2.43
      })
    ).rejects.toThrow('IFU already used');
  });

  it('updates and deletes a pharmacy from admin flow', async () => {
    const created = await adminService.createPharmacy({
      managerFirstName: 'Julie',
      managerLastName: 'Manager',
      managerEmail: 'manager.pharmacy.update@example.com',
      password: 'StrongPass1!',
      country: 'Benin',
      pharmacyName: 'Pharmacie Update',
      pharmacyAddress: 'Rue 10, Cotonou',
      ifu: 'IFU-ADMIN-UP-001',
      latitude: 6.37,
      longitude: 2.39
    });

    const updated = await adminService.updatePharmacy(created.pharmacy._id.toString(), {
      pharmacyName: 'Pharmacie Update 2',
      pharmacyAddress: 'Rue 20, Cotonou',
      operationalStatus: 'OUVERT'
    });

    expect(updated.name).toBe('Pharmacie Update 2');
    expect(updated.address).toBe('Rue 20, Cotonou');
    expect(updated.operationalStatus).toBe('OUVERT');

    const deletion = await adminService.deletePharmacy(created.pharmacy._id.toString());
    expect(deletion.success).toBe(true);

    const deletedPharmacy = await pharmacyModel.findById(created.pharmacy._id).lean();
    const manager = await userModel.findById(created.manager._id).lean();
    expect(deletedPharmacy).toBeNull();
    expect(manager?.isActive).toBe(false);
    expect(manager?.accountStatus).toBe(AccountStatus.SUSPENDU);
  });

  it('creates and lists admin medicaments with search filters', async () => {
    await adminService.createMedicament({
      name: 'Amoxicilline 500mg',
      form: 'Capsule',
      strength: '500mg',
      source: 'Admin'
    });
    await adminService.createMedicament({
      name: 'Paracetamol 1g',
      form: 'Comprimé',
      strength: '1g',
      source: 'Admin'
    });

    const list = await adminService.listMedicaments({
      q: 'amox',
      limit: 10,
      offset: 0,
      sort: 'NAME_ASC'
    });

    expect(list.total).toBe(1);
    expect(list.items).toHaveLength(1);
    expect(list.items[0]?.name).toBe('Amoxicilline 500mg');
    expect(list.items[0]?.form).toBe('Capsule');
  });

  it('updates and deletes an admin medicament', async () => {
    const created = await adminService.createMedicament({
      name: 'Ibuprofene 200mg',
      form: 'Comprimé',
      source: 'Admin'
    });

    const updated = await adminService.updateMedicament(created.id, {
      name: 'Ibuprofène 400mg',
      strength: '400mg'
    });

    expect(updated.name).toBe('Ibuprofène 400mg');
    expect(updated.strength).toBe('400mg');

    const deletion = await adminService.deleteMedicament(created.id);
    expect(deletion.success).toBe(true);

    const list = await adminService.listMedicaments({
      limit: 10,
      offset: 0,
      sort: 'NAME_ASC'
    });
    expect(list.items.find((item) => item.id === created.id)).toBeUndefined();
  });

  it('gets an admin medicament by id', async () => {
    const created = await adminService.createMedicament({
      name: 'Vitamine C 500mg',
      form: 'Comprimé',
      source: 'Admin'
    });

    const found = await adminService.getMedicamentById(created.id);
    expect(found.id).toBe(created.id);
    expect(found.name).toBe('Vitamine C 500mg');
  });

  it('syncs admin medicaments from existing products', async () => {
    await productModel.create({
      name: 'Amoxicilline 500mg',
      scientificName: 'Amoxicilline',
      category: 'Antibiotique',
      isMedicine: true
    });
    await productModel.create({
      name: 'Paracetamol 1g',
      scientificName: 'Paracetamol',
      category: 'Antalgique',
      isMedicine: true
    });

    const result = await adminService.syncMedicamentsFromProducts();
    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(2);

    const list = await adminService.listMedicaments({
      limit: 10,
      offset: 0,
      sort: 'NAME_ASC'
    });

    expect(list.total).toBe(2);
    expect(list.items.map((item) => item.name)).toEqual([
      'Amoxicilline 500mg',
      'Paracetamol 1g'
    ]);
    expect(list.items.every((item) => item.source === 'Catalogue pharmacies')).toBe(
      true
    );
  });
});
