import { JwtService } from '@nestjs/jwt';
import mongoose, { Model, Types } from 'mongoose';
import {
  AccountStatus,
  NotificationType,
  Role,
  ValidationStatus
} from '../common/enums/domain.enums';
import { LocalizationService } from '../common/localization/localization.service';
import { loadBackendEnv } from '../common/testing/load-env';
import { PharmacyValidationsService } from '../pharmacies/pharmacy-validations.service';
import { PharmacyValidation, PharmacyValidationDocument, PharmacyValidationSchema } from '../pharmacies/schemas/pharmacy-validation.schema';
import { Pharmacy, PharmacyDocument, PharmacySchema } from '../pharmacies/schemas/pharmacy.schema';
import { PharmaciesService } from '../pharmacies/pharmacies.service';
import { Notification, NotificationDocument, NotificationSchema } from '../notifications/schemas/notification.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { User, UserDocument, UserSchema } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { AdminService } from '../admin/admin.service';
import { IntegrationValidationService } from '../admin/integration-validation.service';
import { Suspension, SuspensionDocument, SuspensionSchema } from '../admin/schemas/suspension.schema';
import { AuditService } from '../audit/audit.service';
import { AuthService } from './auth.service';
import {
  PasswordResetToken,
  PasswordResetTokenDocument,
  PasswordResetTokenSchema
} from './schemas/password-reset-token.schema';
import {
  RefreshTokenBlacklist,
  RefreshTokenBlacklistDocument,
  RefreshTokenBlacklistSchema
} from './schemas/refresh-token-blacklist.schema';
import {
  EmailVerificationToken,
  EmailVerificationTokenDocument,
  EmailVerificationTokenSchema
} from './schemas/email-verification-token.schema';

loadBackendEnv();
const describeIfMongo = process.env.MONGODB_URI_TEST ? describe : describe.skip;
jest.setTimeout(20000);

describeIfMongo('AuthService registration flow Mongo integration', () => {
  let userModel: Model<UserDocument>;
  let pharmacyModel: Model<PharmacyDocument>;
  let validationModel: Model<PharmacyValidationDocument>;
  let notificationModel: Model<NotificationDocument>;
  let suspensionModel: Model<SuspensionDocument>;
  let blacklistModel: Model<RefreshTokenBlacklistDocument>;
  let resetModel: Model<PasswordResetTokenDocument>;
  let verificationModel: Model<EmailVerificationTokenDocument>;
  let usersService: UsersService;
  let pharmaciesService: PharmaciesService;
  let validationsService: PharmacyValidationsService;
  let notificationsService: NotificationsService;
  let authService: AuthService;
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
    notificationModel =
      mongoose.models.Notification ||
      mongoose.model(Notification.name, NotificationSchema);
    suspensionModel =
      mongoose.models.Suspension || mongoose.model(Suspension.name, SuspensionSchema);
    blacklistModel =
      mongoose.models.RefreshTokenBlacklist ||
      mongoose.model(RefreshTokenBlacklist.name, RefreshTokenBlacklistSchema);
    resetModel =
      mongoose.models.PasswordResetToken ||
      mongoose.model(PasswordResetToken.name, PasswordResetTokenSchema);
    verificationModel =
      mongoose.models.EmailVerificationToken ||
      mongoose.model(EmailVerificationToken.name, EmailVerificationTokenSchema);

    const cloudinaryService = {
      uploadImage: jest.fn(),
      deleteImage: jest.fn(),
    } as never;

    usersService = new UsersService(userModel, cloudinaryService);
    pharmaciesService = new PharmaciesService({} as never, pharmacyModel, cloudinaryService);
    validationsService = new PharmacyValidationsService(validationModel);
    mailerService = { sendMail: jest.fn() };
    const pushSender = { send: jest.fn() } as never;
    notificationsService = new NotificationsService(
      notificationModel,
      usersService,
      mailerService as never,
      new LocalizationService(),
      pushSender
    );

    authService = new AuthService(
      { signAsync: jest.fn(async () => 'token') } as unknown as JwtService,
      usersService,
      mailerService as never,
      new LocalizationService(),
      { geocodeAddress: jest.fn() } as never,
      { verify: jest.fn() } as never,
      pharmaciesService,
      validationsService,
      userModel,
      blacklistModel,
      resetModel,
      verificationModel
    );

    adminService = new AdminService(
      { list: jest.fn() } as unknown as AuditService,
      usersService,
      pharmaciesService,
      validationsService,
      notificationsService,
      { search: jest.fn() } as never,
      new IntegrationValidationService({ get: jest.fn() } as never),
      userModel,
      suspensionModel
    );
  });

  beforeEach(async () => {
    await Promise.all([
      userModel.deleteMany({}).exec(),
      pharmacyModel.deleteMany({}).exec(),
      validationModel.deleteMany({}).exec(),
      notificationModel.deleteMany({}).exec(),
      suspensionModel.deleteMany({}).exec(),
      blacklistModel.deleteMany({}).exec(),
      resetModel.deleteMany({}).exec()
    ]);
    mailerService.sendMail.mockClear();
    process.env.JWT_ACCESS_SECRET = 'access';
    process.env.JWT_REFRESH_SECRET = 'refresh';
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it('registers a pharmacy and completes validation approval', async () => {
    const admin = await userModel.create({
      firstName: 'Admin',
      lastName: 'Root',
      email: 'admin.flow@example.com',
      passwordHash: 'hash',
      role: Role.ADMIN,
      accountStatus: AccountStatus.VALIDE,
      isActive: true,
      country: 'Benin'
    });

    await authService.registerPharmacy({
      managerFirstName: 'Sarah',
      managerLastName: 'Manager',
      managerEmail: 'manager.flow@example.com',
      password: 'Admin123!',
      country: 'Benin',
      pharmacyName: 'Pharmacie Flow',
      pharmacyAddress: 'Cotonou Centre',
      ifu: 'IFU-FLOW-001',
      latitude: 6.3,
      longitude: 2.4,
      documentFileIds: ['file-a', 'file-b']
    });

    const manager = await userModel.findOne({ email: 'manager.flow@example.com' }).lean();
    expect(manager).toBeTruthy();
    expect(manager?.accountStatus).toBe(AccountStatus.EN_ATTENTE);

    const pharmacy = await pharmacyModel.findOne({ ownerId: manager?._id }).lean();
    expect(pharmacy).toBeTruthy();
    expect(pharmacy?.accountStatus).toBe(AccountStatus.EN_ATTENTE);

    const validation = await validationModel.findOne({ pharmacyId: pharmacy?._id }).lean();
    expect(validation).toBeTruthy();
    expect(validation?.status).toBe(ValidationStatus.EN_ATTENTE);
    expect(validation?.documents).toEqual(['file-a', 'file-b']);

    await adminService.approveValidation(
      validation?._id.toString() ?? '',
      admin._id.toString(),
      'ok'
    );

    const updatedManager = await userModel.findById(manager?._id).lean();
    const updatedPharmacy = await pharmacyModel.findById(pharmacy?._id).lean();
    const updatedValidation = await validationModel.findById(validation?._id).lean();
    const notifications = await notificationModel.find({ userId: manager?._id }).lean();

    expect(updatedManager?.accountStatus).toBe(AccountStatus.VALIDE);
    expect(updatedManager?.emailVerifiedAt).toBeTruthy();
    expect(updatedPharmacy?.accountStatus).toBe(AccountStatus.VALIDE);
    expect(updatedValidation?.status).toBe(ValidationStatus.VALIDE);
    expect(updatedValidation?.reviewedByAdminId).toBeInstanceOf(Types.ObjectId);
    expect(updatedValidation?.reviewedAt).toBeTruthy();
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.type).toBe(NotificationType.VALIDATION_COMPTE);
  });
});
