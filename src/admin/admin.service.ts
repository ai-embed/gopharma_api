import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model, Types } from 'mongoose';
import { AuditLogQueryDto } from '../audit/dto/audit-log-query.dto';
import { AuditService } from '../audit/audit.service';
import {
  AccountStatus,
  NotificationType,
  Role,
  ValidationStatus
} from '../common/enums/domain.enums';
import { NotificationsService } from '../notifications/notifications.service';
import { PharmaciesService } from '../pharmacies/pharmacies.service';
import { PharmacyValidationsService } from '../pharmacies/pharmacy-validations.service';
import { PublicDrugsService } from '../public-drugs/public-drugs.service';
import { PublicDrugsSort } from '../public-drugs/dto/public-drugs-query.dto';
import { UsersService } from '../users/users.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { IntegrationValidationService } from './integration-validation.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { CreateAdminPharmacyDto } from './dto/create-admin-pharmacy.dto';
import { SuspendAccountDto } from './dto/suspend-account.dto';
import {
  AdminGrowthOverviewResponseDto,
  AdminMedicamentsListResponseDto,
  AdminReportsOverviewResponseDto
} from './dto/admin-response.dto';
import { CreateAdminMedicamentDto } from './dto/create-admin-medicament.dto';
import { Suspension, SuspensionDocument } from './schemas/suspension.schema';
import { UpdateAdminMedicamentDto } from './dto/update-admin-medicament.dto';
import { UpdateAdminPharmacyDto } from './dto/update-admin-pharmacy.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { InventoryItem, InventoryItemDocument } from '../catalog/schemas/inventory-item.schema';
import { Product, ProductDocument } from '../catalog/schemas/product.schema';

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date);
}

function inLastDays(iso: string | Date | undefined, days: number, fromOffsetDays = 0) {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const end = new Date(now);
  end.setDate(now.getDate() - fromOffsetDays);
  const start = new Date(end);
  start.setDate(end.getDate() - days);
  return date >= start && date < end;
}

function computeGrowth(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

function roleLabel(role: string) {
  const normalized = role.toUpperCase();
  if (normalized.includes('PHARM')) return 'Pharmacies';
  if (normalized.includes('ADMIN')) return 'Admins';
  if (normalized.includes('PATIENT')) return 'Patients';
  return 'Autres';
}

function extractCreatedAt(value: unknown): string | Date | undefined {
  if (!value || typeof value !== 'object') return undefined;
  return (value as { createdAt?: string | Date }).createdAt;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly auditService: AuditService,
    private readonly usersService: UsersService,
    private readonly pharmaciesService: PharmaciesService,
    private readonly validationsService: PharmacyValidationsService,
    private readonly notificationsService: NotificationsService,
    private readonly publicDrugsService: PublicDrugsService,
    private readonly integrationValidationService: IntegrationValidationService,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Suspension.name)
    private readonly suspensionModel: Model<SuspensionDocument>,
    @Optional()
    @InjectModel(InventoryItem.name)
    private readonly inventoryModel?: Model<InventoryItemDocument>,
    @Optional()
    @InjectModel(Product.name)
    private readonly productModel?: Model<ProductDocument>
  ) {}

  listUsers() {
    return this.usersService.listUsers();
  }

  getUserById(userId: string) {
    return this.usersService.findById(userId);
  }

  listPharmacies() {
    return this.pharmaciesService.listForAdmin();
  }

  getPharmacyById(pharmacyId: string) {
    return this.pharmaciesService.getByIdAnyStatus(pharmacyId);
  }

  listAuditLogs(query: AuditLogQueryDto) {
    return this.auditService.list(query);
  }

  getIntegrationsStatus() {
    return this.integrationValidationService.getStatus();
  }

  validateIntegrations() {
    return this.integrationValidationService.validateConnections();
  }

  listValidations() {
    return this.validationsService.listPending();
  }

  listMedicaments(
    query: {
      q?: string;
      limit?: number;
      offset?: number;
      form?: string;
      sort?: PublicDrugsSort;
    }
  ): Promise<AdminMedicamentsListResponseDto> {
    return this.publicDrugsService.search({
      q: query.q,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
      form: query.form,
      sort: query.sort
    });
  }

  createMedicament(dto: CreateAdminMedicamentDto) {
    return this.publicDrugsService.createCatalogEntry(dto);
  }

  updateMedicament(id: string, dto: UpdateAdminMedicamentDto) {
    return this.publicDrugsService.updateCatalogEntry(id, dto);
  }

  getMedicamentById(id: string) {
    return this.publicDrugsService.getCatalogEntryById(id);
  }

  deleteMedicament(id: string) {
    return this.publicDrugsService.deleteCatalogEntry(id);
  }

  async syncMedicamentsFromProducts() {
    if (!this.productModel) {
      return { success: true as const, syncedCount: 0 };
    }

    const products = await this.productModel
      .find(
        {},
        {
          name: 1,
          scientificName: 1,
          category: 1,
          barcode: 1,
          form: 1,
          strength: 1,
          laboratory: 1,
          atcCode: 1,
          country: 1,
          source: 1
        }
      )
      .lean()
      .exec();

    const sourceByProductId = new Map<string, { pharmacyId?: string; pharmacyName?: string }>();
    if (this.inventoryModel) {
      const inventories = await this.inventoryModel
        .find({}, { productId: 1, pharmacyId: 1, updatedAt: 1 })
        .sort({ updatedAt: -1 })
        .lean()
        .exec();

      const pharmacyIds = Array.from(
        new Set(
          inventories
            .map((item) => item.pharmacyId?.toString())
            .filter((item): item is string => Boolean(item))
        )
      );

      const pharmacies = pharmacyIds.length
        ? await this.pharmaciesService.listForAdmin()
        : [];
      const pharmacyById = new Map(
        pharmacies.map((pharmacy) => [pharmacy._id.toString(), pharmacy.name])
      );

      for (const inventory of inventories) {
        const productId = inventory.productId?.toString();
        if (!productId || sourceByProductId.has(productId)) continue;
        const pharmacyId = inventory.pharmacyId?.toString();
        sourceByProductId.set(productId, {
          pharmacyId,
          pharmacyName: pharmacyId ? pharmacyById.get(pharmacyId) : undefined
        });
      }
    }

    let syncedCount = 0;
    for (const product of products) {
      const source = sourceByProductId.get(product._id.toString());
      await this.publicDrugsService.upsertCatalogEntryFromManagerProduct({
        externalProductId: product._id.toString(),
        name: product.name,
        scientificName: product.scientificName,
        category: product.category,
        barcode: product.barcode,
        form: product.form,
        strength: product.strength,
        laboratory: product.laboratory,
        atcCode: product.atcCode,
        country: product.country,
        source: product.source,
        sourcePharmacyId: source?.pharmacyId,
        sourcePharmacyName: source?.pharmacyName
      });
      syncedCount += 1;
    }

    return { success: true as const, syncedCount };
  }

  async cleanupOrphanProducts() {
    if (!this.productModel || !this.inventoryModel) {
      return {
        success: true as const,
        deletedProducts: 0,
        deletedAdminMedicaments: 0
      };
    }

    const linkedProductIds = await this.inventoryModel.distinct('productId').exec();
    const linkedSet = new Set(
      linkedProductIds
        .map((value) => value?.toString?.())
        .filter((value): value is string => Boolean(value))
    );

    const allProducts = await this.productModel.find({}, { _id: 1 }).lean().exec();
    const orphanIds = allProducts
      .map((item) => item._id.toString())
      .filter((id) => !linkedSet.has(id));

    let deletedProducts = 0;
    if (orphanIds.length > 0) {
      const deletion = await this.productModel
        .deleteMany({ _id: { $in: orphanIds.map((id) => new Types.ObjectId(id)) } })
        .exec();
      deletedProducts = deletion.deletedCount ?? 0;
    }

    const deletedAdminMedicaments = (
      await this.publicDrugsService.cleanupOrphanCatalogEntries()
    ).deletedCount;

    return {
      success: true as const,
      deletedProducts,
      deletedAdminMedicaments
    };
  }

  async getReportsOverview(): Promise<AdminReportsOverviewResponseDto> {
    const [audit, validations, pharmacies, integrations] = await Promise.all([
      this.auditService.list({ page: 1, limit: 100 }),
      this.validationsService.listPending(),
      this.pharmaciesService.listForAdmin(),
      Promise.resolve(this.integrationValidationService.getStatus())
    ]);

    const logs = audit.items ?? [];
    const now = new Date();
    const days: Date[] = [];
    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - index);
      days.push(date);
    }

    const counts = new Map<string, number>();
    for (const item of logs) {
      const createdAt = extractCreatedAt(item);
      if (!createdAt) continue;
      const date = new Date(createdAt);
      if (Number.isNaN(date.getTime())) continue;
      const key = dayKey(date);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const weeklyBars = days.map((date) => ({
      day: formatDay(date),
      count: counts.get(dayKey(date)) ?? 0
    }));

    const errorEvents = logs.filter((item) => item.outcome === 'ERROR').length;
    const pendingValidations = validations.length;
    const integrationErrors =
      Number(integrations.smtp.status !== 'OK') +
      Number(integrations.googleMaps.status !== 'OK');
    const alertsTotal = errorEvents + pendingValidations + integrationErrors;

    const incidents: AdminReportsOverviewResponseDto['incidents'] = [
      {
        label:
          errorEvents > 0
            ? `${errorEvents} erreur(s) API détectée(s)`
            : 'Aucune erreur API détectée',
        tone: errorEvents > 0 ? 'rose' : 'emerald'
      },
      {
        label:
          pendingValidations > 0
            ? `${pendingValidations} pharmacie(s) en attente de validation`
            : 'Aucune validation en attente',
        tone: pendingValidations > 0 ? 'amber' : 'emerald'
      },
      {
        label:
          integrationErrors > 0
            ? `${integrationErrors} intégration(s) en alerte`
            : 'Intégrations opérationnelles',
        tone: integrationErrors > 0 ? 'amber' : 'emerald'
      }
    ];

    return {
      reportTotal: audit.total ?? logs.length,
      alertsTotal,
      pharmaciesTotal: pharmacies.length,
      errorEvents,
      pendingValidations,
      weeklyBars,
      incidents
    };
  }

  async getGrowthOverview(): Promise<AdminGrowthOverviewResponseDto> {
    const [users, pharmacies, audit] = await Promise.all([
      this.usersService.listUsers(),
      this.pharmaciesService.listForAdmin(),
      this.auditService.list({ page: 1, limit: 100 })
    ]);

    const logs = audit.items ?? [];

    const usersCurrent = users.filter((item) => inLastDays(extractCreatedAt(item), 30)).length;
    const usersPrevious = users.filter((item) =>
      inLastDays(extractCreatedAt(item), 30, 30)
    ).length;
    const pharmaciesCurrent = pharmacies.filter((item) =>
      inLastDays(extractCreatedAt(item), 30)
    ).length;
    const pharmaciesPrevious = pharmacies.filter((item) =>
      inLastDays(extractCreatedAt(item), 30, 30)
    ).length;

    const searchesCount = logs.filter(
      (item) =>
        item.path.toLowerCase().includes('/search') &&
        inLastDays(extractCreatedAt(item), 30)
    ).length;

    const countryCounts = users.reduce<Map<string, number>>((acc, item) => {
      const country = item.country?.trim() || 'Inconnu';
      acc.set(country, (acc.get(country) ?? 0) + 1);
      return acc;
    }, new Map());

    const topCountries = Array.from(countryCounts.entries())
      .map(([country, count]) => ({
        country,
        count,
        percent: users.length === 0 ? 0 : Math.round((count / users.length) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    const roleCounts = users.reduce<Map<string, number>>((acc, item) => {
      const label = roleLabel(item.role);
      acc.set(label, (acc.get(label) ?? 0) + 1);
      return acc;
    }, new Map());

    const roleBreakdown = Array.from(roleCounts.entries())
      .map(([label, count]) => ({
        label,
        count,
        percent: users.length === 0 ? 0 : Math.round((count / users.length) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    return {
      usersGrowth: computeGrowth(usersCurrent, usersPrevious),
      usersCurrent,
      pharmaciesGrowth: computeGrowth(pharmaciesCurrent, pharmaciesPrevious),
      pharmaciesCurrent,
      searchesCount,
      topCountries,
      roleBreakdown
    };
  }

  async approveValidation(validationId: string, adminUserId: string, comment?: string) {
    const validation = await this.validationsService.updateStatus(
      validationId,
      adminUserId,
      ValidationStatus.VALIDE,
      comment
    );

    const pharmacy = await this.pharmaciesService.updateStatus(
      validation.pharmacyId.toString(),
      AccountStatus.VALIDE,
      new Date()
    );

    const user = await this.usersService.findById(validation.requestedByUserId.toString());
    user.accountStatus = AccountStatus.VALIDE;
    if (!user.emailVerifiedAt) {
      user.emailVerifiedAt = new Date();
    }
    await user.save();

    await this.notificationsService.notifyUser(
      user._id.toString(),
      NotificationType.VALIDATION_COMPTE,
      {
        titleKey: 'notification.validationApproved.title',
        messageKey: 'notification.validationApproved.message',
        params: {
          pharmacyName: pharmacy.name
        }
      }
    );

    return { validation, pharmacy };
  }

  async rejectValidation(validationId: string, adminUserId: string, comment?: string) {
    const validation = await this.validationsService.updateStatus(
      validationId,
      adminUserId,
      ValidationStatus.REJETE,
      comment
    );

    await this.pharmaciesService.updateStatus(
      validation.pharmacyId.toString(),
      AccountStatus.SUSPENDU
    );

    const user = await this.usersService.findById(validation.requestedByUserId.toString());
    user.accountStatus = AccountStatus.SUSPENDU;
    await user.save();

    await this.notificationsService.notifyUser(
      user._id.toString(),
      NotificationType.VALIDATION_COMPTE,
      {
        titleKey: 'notification.validationRejected.title',
        messageKey: 'notification.validationRejected.message',
        params: {
          comment: comment ?? ''
        }
      }
    );

    return { validation };
  }

  async suspendAccount(targetUserId: string, adminUserId: string, dto: SuspendAccountDto) {
    const user = await this.usersService.findById(targetUserId);
    user.accountStatus = AccountStatus.SUSPENDU;
    user.isActive = false;
    await user.save();

    let pharmacyId: Types.ObjectId | undefined;
    if (user.role === Role.PHARMACY_MANAGER) {
      const pharmacy = await this.pharmaciesService.findByOwner(user._id.toString());
      pharmacyId = pharmacy._id;
      await this.pharmaciesService.updateStatus(pharmacy._id.toString(), AccountStatus.SUSPENDU);
    }

    await this.suspensionModel.create({
      targetUserId: user._id,
      targetPharmacyId: pharmacyId,
      reason: dto.reason,
      startDate: new Date(),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      isActive: true,
      createdByAdminId: new Types.ObjectId(adminUserId)
    });

    await this.notificationsService.notifyUser(
      user._id.toString(),
      NotificationType.SUSPENSION,
      {
        titleKey: 'notification.accountSuspended.title',
        messageKey: 'notification.accountSuspended.message',
        params: {
          reason: dto.reason
        }
      }
    );

    return { success: true };
  }

  async unsuspendAccount(targetUserId: string) {
    const user = await this.usersService.findById(targetUserId);
    user.accountStatus = AccountStatus.VALIDE;
    user.isActive = true;
    await user.save();

    await this.suspensionModel
      .updateMany(
        { targetUserId: user._id, isActive: true },
        { $set: { isActive: false, endDate: new Date() } }
      )
      .exec();

    if (user.role === Role.PHARMACY_MANAGER) {
      const pharmacy = await this.pharmaciesService.findByOwner(user._id.toString());
      await this.pharmaciesService.updateStatus(
        pharmacy._id.toString(),
        AccountStatus.VALIDE,
        new Date()
      );
    }

    await this.notificationsService.notifyUser(
      user._id.toString(),
      NotificationType.SUSPENSION,
      {
        titleKey: 'notification.accountReactivated.title',
        messageKey: 'notification.accountReactivated.message'
      }
    );

    return { success: true };
  }

  async createUser(dto: CreateAdminUserDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const role = dto.role ?? Role.PATIENT;
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.userModel.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      passwordHash,
      country: dto.country,
      phoneNumber: dto.phoneNumber,
      role,
      accountStatus: AccountStatus.VALIDE,
      isActive: true,
      emailVerifiedAt: new Date()
    });

    return {
      success: true,
      message: 'User created by admin',
      user
    };
  }

  async updateUser(userId: string, dto: UpdateAdminUserDto) {
    const user = await this.usersService.findById(userId);

    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const existing = await this.usersService.findByEmail(dto.email);
      if (existing && existing._id.toString() !== user._id.toString()) {
        throw new BadRequestException('Email already registered');
      }
      user.email = dto.email.toLowerCase();
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.country !== undefined) user.country = dto.country;
    if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.accountStatus !== undefined) user.accountStatus = dto.accountStatus;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    await user.save();
    return user;
  }

  async deleteUser(userId: string) {
    const user = await this.usersService.findById(userId);

    if (user.role === Role.PHARMACY_MANAGER) {
      const ownerHasPharmacy = await this.pharmaciesService.ownerHasAnyPharmacy(
        user._id.toString()
      );
      if (ownerHasPharmacy) {
        throw new BadRequestException(
          'Cannot delete manager while a pharmacy is linked. Delete pharmacy first.'
        );
      }
    }

    await this.userModel.findByIdAndDelete(user._id).exec();
    return { success: true };
  }

  async createPharmacy(dto: CreateAdminPharmacyDto) {
    const existingManager = await this.usersService.findByEmail(dto.managerEmail);
    if (existingManager) {
      throw new BadRequestException('Manager email already registered');
    }

    const existingIfu = await this.pharmaciesService.findByIfu(dto.ifu);
    if (existingIfu) {
      throw new BadRequestException('IFU already used');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const manager = await this.userModel.create({
      firstName: dto.managerFirstName,
      lastName: dto.managerLastName,
      email: dto.managerEmail.toLowerCase(),
      passwordHash,
      country: dto.country,
      role: Role.PHARMACY_MANAGER,
      accountStatus: AccountStatus.VALIDE,
      isActive: true,
      emailVerifiedAt: new Date()
    });

    const pharmacy = await this.pharmaciesService.createByAdmin(manager, dto);

    return {
      manager,
      pharmacy,
      message: 'Pharmacy created by admin'
    };
  }

  async updatePharmacy(pharmacyId: string, dto: UpdateAdminPharmacyDto) {
    if (dto.latitude !== undefined && dto.longitude === undefined) {
      throw new BadRequestException('Longitude is required when latitude is provided');
    }
    if (dto.longitude !== undefined && dto.latitude === undefined) {
      throw new BadRequestException('Latitude is required when longitude is provided');
    }

    const pharmacy = await this.pharmaciesService.getByIdAnyStatus(pharmacyId);

    if (dto.ifu && dto.ifu !== pharmacy.ifu) {
      const existingIfu = await this.pharmaciesService.findByIfu(dto.ifu);
      if (existingIfu && existingIfu._id.toString() !== pharmacy._id.toString()) {
        throw new BadRequestException('IFU already used');
      }
    }

    return this.pharmaciesService.updateByAdmin(pharmacyId, {
      pharmacyName: dto.pharmacyName,
      pharmacyAddress: dto.pharmacyAddress,
      ifu: dto.ifu,
      latitude: dto.latitude,
      longitude: dto.longitude,
      description: dto.description,
      email: dto.email?.toLowerCase(),
      services: dto.services,
      accountStatus: dto.accountStatus,
      operationalStatus: dto.operationalStatus
    });
  }

  async deletePharmacy(pharmacyId: string) {
    const pharmacy = await this.pharmaciesService.deleteById(pharmacyId);
    await this.validationsService.deleteByPharmacyId(pharmacyId);
    await this.cleanupCatalogForDeletedPharmacy(pharmacy._id);

    const owner = await this.usersService.findById(pharmacy.ownerId.toString());
    if (owner.role === Role.PHARMACY_MANAGER) {
      const stillHasPharmacy = await this.pharmaciesService.ownerHasAnyPharmacy(
        owner._id.toString()
      );
      if (!stillHasPharmacy) {
        owner.accountStatus = AccountStatus.SUSPENDU;
        owner.isActive = false;
        await owner.save();
      }
    }

    return { success: true };
  }

  private async cleanupCatalogForDeletedPharmacy(pharmacyObjectId: Types.ObjectId) {
    if (!this.inventoryModel) {
      return;
    }

    const orphanCandidateIds = await this.inventoryModel
      .distinct('productId', { pharmacyId: pharmacyObjectId })
      .exec();

    await this.inventoryModel.deleteMany({ pharmacyId: pharmacyObjectId }).exec();

    if (!this.productModel || orphanCandidateIds.length === 0) {
      return;
    }

    const stillReferenced = await this.inventoryModel
      .distinct('productId', {
        productId: { $in: orphanCandidateIds }
      })
      .exec();

    const stillReferencedSet = new Set(stillReferenced.map((id) => id.toString()));
    const orphanIds = orphanCandidateIds.filter(
      (productId) => !stillReferencedSet.has(productId.toString())
    );

    if (orphanIds.length > 0) {
      await this.productModel
        .deleteMany({
          _id: { $in: orphanIds }
        })
        .exec();
    }
  }
}
