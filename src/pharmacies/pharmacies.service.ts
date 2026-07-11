import { forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AccountStatus } from '../common/enums/domain.enums';
import { CloudinaryService } from '../common/services/cloudinary.service';
import { SchedulesService } from '../schedules/schedules.service';
import { RegisterPharmacyDto } from '../auth/dto/register-pharmacy.dto';
import { UserDocument } from '../users/schemas/user.schema';
import { PharmacyQueryDto } from './dto/pharmacy-query.dto';
import { UpdateManagerPharmacyDto } from './dto/update-manager-pharmacy.dto';
import { Pharmacy, PharmacyDocument } from './schemas/pharmacy.schema';

@Injectable()
export class PharmaciesService {
  private readonly logger = new Logger(PharmaciesService.name);

  private normalizeBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
    return undefined;
  }

  constructor(
    @Inject(forwardRef(() => SchedulesService))
    private readonly schedulesService: SchedulesService,
    @InjectModel(Pharmacy.name)
    private readonly pharmacyModel: Model<PharmacyDocument>,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  async createFromRegistration(manager: UserDocument, dto: RegisterPharmacyDto) {
    return this.pharmacyModel.create({
      name: dto.pharmacyName,
      address: dto.pharmacyAddress,
      location: {
        type: 'Point',
        coordinates: [dto.longitude, dto.latitude]
      },
      ifu: dto.ifu,
      ownerId: manager._id,
      description: dto.description,
      email: dto.managerEmail,
      accountStatus: AccountStatus.EN_ATTENTE
    });
  }

  async createByAdmin(
    manager: UserDocument,
    dto: {
      pharmacyName: string;
      pharmacyAddress: string;
      latitude: number;
      longitude: number;
      ifu: string;
      description?: string;
      managerEmail: string;
    }
  ) {
    return this.pharmacyModel.create({
      name: dto.pharmacyName,
      address: dto.pharmacyAddress,
      location: {
        type: 'Point',
        coordinates: [dto.longitude, dto.latitude]
      },
      ifu: dto.ifu,
      ownerId: manager._id,
      description: dto.description,
      email: dto.managerEmail,
      accountStatus: AccountStatus.VALIDE,
      validationDate: new Date()
    });
  }

  async findByIfu(ifu: string) {
    return this.pharmacyModel.findOne({ ifu }).exec();
  }

  async findByOwner(ownerUserId: string): Promise<PharmacyDocument> {
    const pharmacy = await this.pharmacyModel
      .findOne({ ownerId: new Types.ObjectId(ownerUserId) })
      .exec();

    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found for current manager');
    }

    return pharmacy;
  }

  async updateManagerPharmacy(ownerUserId: string, dto: UpdateManagerPharmacyDto) {
    const pharmacy = await this.findByOwner(ownerUserId);

    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      pharmacy.location = {
        type: 'Point',
        coordinates: [dto.longitude, dto.latitude]
      };
    }

    if (dto.name !== undefined) pharmacy.name = dto.name;
    if (dto.address !== undefined) pharmacy.address = dto.address;
    if (dto.description !== undefined) pharmacy.description = dto.description;
    if (dto.email !== undefined) pharmacy.email = dto.email;
    if (dto.services !== undefined) pharmacy.services = dto.services;

    await pharmacy.save();
    return pharmacy;
  }

  async uploadPhoto(
    ownerUserId: string,
    file: Express.Multer.File
  ): Promise<{ pharmacy: PharmacyDocument; photoUrl: string }> {
    const pharmacy = await this.findByOwner(ownerUserId);

    // Supprimer l'ancienne photo si elle existe
    if (pharmacy.photoUrl) {
      try {
        const publicId = this.extractPublicIdFromUrl(pharmacy.photoUrl);
        if (publicId) {
          await this.cloudinaryService.deleteImage(publicId);
        }
      } catch (error) {
        this.logger.warn('Failed to delete old photo:', error);
      }
    }

    // Uploader la nouvelle photo
    const uploadResult = await this.cloudinaryService.uploadImage(
      file,
      `pharmacies/${pharmacy._id}/photo`,
      {
        width: 400,
        height: 400,
        crop: 'fill',
      }
    );

    pharmacy.photoUrl = uploadResult.url;
    await pharmacy.save();

    return { pharmacy, photoUrl: uploadResult.url };
  }

  async uploadBanner(
    ownerUserId: string,
    file: Express.Multer.File
  ): Promise<{ pharmacy: PharmacyDocument; bannerUrl: string }> {
    const pharmacy = await this.findByOwner(ownerUserId);

    // Supprimer l'ancienne bannière si elle existe
    if (pharmacy.bannerUrl) {
      try {
        const publicId = this.extractPublicIdFromUrl(pharmacy.bannerUrl);
        if (publicId) {
          await this.cloudinaryService.deleteImage(publicId);
        }
      } catch (error) {
        this.logger.warn('Failed to delete old banner:', error);
      }
    }

    // Uploader la nouvelle bannière
    const uploadResult = await this.cloudinaryService.uploadImage(
      file,
      `pharmacies/${pharmacy._id}/banner`,
      {
        width: 1200,
        height: 400,
        crop: 'fill',
      }
    );

    pharmacy.bannerUrl = uploadResult.url;
    await pharmacy.save();

    return { pharmacy, bannerUrl: uploadResult.url };
  }

  async deletePhoto(ownerUserId: string): Promise<PharmacyDocument> {
    const pharmacy = await this.findByOwner(ownerUserId);

    if (pharmacy.photoUrl) {
      try {
        const publicId = this.extractPublicIdFromUrl(pharmacy.photoUrl);
        if (publicId) {
          await this.cloudinaryService.deleteImage(publicId);
        }
      } catch (error) {
        this.logger.warn('Failed to delete photo:', error);
      }

      pharmacy.photoUrl = undefined;
      await pharmacy.save();
    }

    return pharmacy;
  }

  async deleteBanner(ownerUserId: string): Promise<PharmacyDocument> {
    const pharmacy = await this.findByOwner(ownerUserId);

    if (pharmacy.bannerUrl) {
      try {
        const publicId = this.extractPublicIdFromUrl(pharmacy.bannerUrl);
        if (publicId) {
          await this.cloudinaryService.deleteImage(publicId);
        }
      } catch (error) {
        this.logger.warn('Failed to delete banner:', error);
      }

      pharmacy.bannerUrl = undefined;
      await pharmacy.save();
    }

    return pharmacy;
  }

  private extractPublicIdFromUrl(url: string): string | null {
    const match = url.match(/\/upload\/[^/]+\/(.+)\.[^.]+$/);
    return match ? match[1] : null;
  }

  async updateOperationalStatus(
    ownerUserId: string,
    operationalStatus: 'OUVERT' | 'FERME'
  ) {
    const pharmacy = await this.findByOwner(ownerUserId);
    pharmacy.operationalStatus = operationalStatus;
    await pharmacy.save();
    return pharmacy;
  }

  async listPublic(query: PharmacyQueryDto) {
    const openNow = this.normalizeBoolean(query.openNow);
    const seedOnly = this.normalizeBoolean(query.seedOnly);
    const mongoQuery: FilterQuery<PharmacyDocument> = {
      accountStatus: AccountStatus.VALIDE
    };

    if (seedOnly === true) {
      mongoQuery.isSeeded = true;
    }

    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      mongoQuery.$or = [{ name: regex }, { address: regex }];
    }

    if (query.lat !== undefined && query.lng !== undefined) {
      const maxDistanceKm = query.maxDistanceKm ?? query.radiusKm;
      const minDistanceKm = query.minDistanceKm;
      const nearFilter: {
        $geometry: { type: 'Point'; coordinates: [number, number] };
        $maxDistance?: number;
        $minDistance?: number;
      } = {
        $geometry: {
          type: 'Point',
          coordinates: [query.lng, query.lat]
        }
      };

      if (maxDistanceKm !== undefined) {
        nearFilter.$maxDistance = maxDistanceKm * 1000;
      }

      if (minDistanceKm !== undefined && minDistanceKm > 0) {
        nearFilter.$minDistance = minDistanceKm * 1000;
      }

      mongoQuery.location = {
        $near: nearFilter
      };
    }

    const pharmacies = await this.pharmacyModel
      .find(mongoQuery)
      .sort({ createdAt: -1 })
      .exec();

    const statuses = await this.schedulesService.getOpenStatusMap(
      pharmacies.map((pharmacy) => pharmacy._id.toString())
    );

    return pharmacies
      .map((pharmacy) => this.attachPublicAvailability(pharmacy, statuses.get(pharmacy._id.toString())))
      .filter((pharmacy) => (openNow === true ? pharmacy.openNow : true));
  }

  async listPublicIdsByGeo(input: {
    lat: number;
    lng: number;
    radiusKm?: number;
    minDistanceKm?: number;
    maxDistanceKm?: number;
  }) {
    const maxDistanceKm = input.maxDistanceKm ?? input.radiusKm;
    const minDistanceKm = input.minDistanceKm;
    const nearFilter: {
      $geometry: { type: 'Point'; coordinates: [number, number] };
      $maxDistance?: number;
      $minDistance?: number;
    } = {
      $geometry: {
        type: 'Point',
        coordinates: [input.lng, input.lat]
      }
    };

    if (maxDistanceKm !== undefined) {
      nearFilter.$maxDistance = maxDistanceKm * 1000;
    }

    if (minDistanceKm !== undefined && minDistanceKm > 0) {
      nearFilter.$minDistance = minDistanceKm * 1000;
    }

    const pharmacies = await this.pharmacyModel
      .find({
        accountStatus: AccountStatus.VALIDE,
        location: {
          $near: nearFilter
        }
      })
      .select({ _id: 1 })
      .exec();

    return pharmacies.map((pharmacy) => pharmacy._id.toString());
  }

  async getPublicById(pharmacyId: string) {
    if (!Types.ObjectId.isValid(pharmacyId)) {
      throw new NotFoundException('Pharmacy not found');
    }
    const pharmacy = await this.pharmacyModel
      .findOne({ _id: pharmacyId, accountStatus: AccountStatus.VALIDE })
      .exec();
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    const scheduleStatus = await this.schedulesService.getOpenStatusForPharmacy(
      pharmacy._id.toString()
    );

    return this.attachPublicAvailability(pharmacy, scheduleStatus);
  }

  async getByIdAnyStatus(pharmacyId: string) {
    if (!Types.ObjectId.isValid(pharmacyId)) {
      throw new NotFoundException('Pharmacy not found');
    }
    const pharmacy = await this.pharmacyModel.findById(pharmacyId).exec();
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }
    return pharmacy;
  }

  async updateStatus(
    pharmacyId: string,
    status: AccountStatus,
    validationDate?: Date
  ) {
    const pharmacy = await this.pharmacyModel
      .findByIdAndUpdate(
        pharmacyId,
        {
          $set: {
            accountStatus: status,
            ...(validationDate && { validationDate })
          }
        },
        { new: true }
      )
      .exec();

    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    return pharmacy;
  }

  async updateByAdmin(
    pharmacyId: string,
    input: {
      pharmacyName?: string;
      pharmacyAddress?: string;
      ifu?: string;
      latitude?: number;
      longitude?: number;
      description?: string;
      email?: string;
      services?: string[];
      accountStatus?: AccountStatus;
      operationalStatus?: 'OUVERT' | 'FERME';
    }
  ) {
    const pharmacy = await this.getByIdAnyStatus(pharmacyId);

    if (input.latitude !== undefined && input.longitude !== undefined) {
      pharmacy.location = {
        type: 'Point',
        coordinates: [input.longitude, input.latitude]
      };
    }

    if (input.pharmacyName !== undefined) pharmacy.name = input.pharmacyName;
    if (input.pharmacyAddress !== undefined) pharmacy.address = input.pharmacyAddress;
    if (input.ifu !== undefined) pharmacy.ifu = input.ifu;
    if (input.description !== undefined) pharmacy.description = input.description;
    if (input.email !== undefined) pharmacy.email = input.email;
    if (input.services !== undefined) pharmacy.services = input.services;
    if (input.accountStatus !== undefined) pharmacy.accountStatus = input.accountStatus;
    if (input.operationalStatus !== undefined) pharmacy.operationalStatus = input.operationalStatus;

    await pharmacy.save();
    return pharmacy;
  }

  async deleteById(pharmacyId: string) {
    const pharmacy = await this.pharmacyModel.findByIdAndDelete(pharmacyId).exec();
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }
    return pharmacy;
  }

  async ownerHasAnyPharmacy(ownerId: string) {
    const count = await this.pharmacyModel
      .countDocuments({ ownerId: new Types.ObjectId(ownerId) })
      .exec();
    return count > 0;
  }

  async listForAdmin(status?: AccountStatus) {
    const query = status ? { accountStatus: status } : {};
    return this.pharmacyModel.find(query).sort({ createdAt: -1 }).exec();
  }

  private attachPublicAvailability(
    pharmacy: PharmacyDocument,
    scheduleStatus?: {
      openNow: boolean;
      source: 'manual' | 'schedule';
      nextTransitionAt?: string;
      matchedRule?: string;
    }
  ) {
    const serialized = pharmacy.toObject();
    const derivedOpenNow = scheduleStatus?.source === 'schedule'
      ? scheduleStatus.openNow
      : pharmacy.operationalStatus === 'OUVERT';

    return {
      ...serialized,
      openNow: derivedOpenNow,
      operationalStatus: derivedOpenNow ? 'OUVERT' : 'FERME',
      availabilitySource: scheduleStatus?.source ?? 'manual',
      nextTransitionAt: scheduleStatus?.nextTransitionAt,
      matchedRule: scheduleStatus?.matchedRule
    };
  }
}
