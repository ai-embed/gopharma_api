import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ValidationStatus } from 'src/common/enums/domain.enums';
import {
  PharmacyValidation,
  PharmacyValidationDocument
} from './schemas/pharmacy-validation.schema';

@Injectable()
export class PharmacyValidationsService {
  constructor(
    @InjectModel(PharmacyValidation.name)
    private readonly validationModel: Model<PharmacyValidationDocument>
  ) {}

  async createValidation(input: {
    pharmacyId: string;
    requestedByUserId: string;
    status: ValidationStatus;
    documents: string[];
  }): Promise<PharmacyValidationDocument> {
    return this.validationModel.create({
      pharmacyId: new Types.ObjectId(input.pharmacyId),
      requestedByUserId: new Types.ObjectId(input.requestedByUserId),
      status: input.status,
      documents: input.documents
    });
  }

  async listPending() {
    return this.validationModel
      .find({ status: ValidationStatus.EN_ATTENTE })
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateStatus(
    validationId: string,
    adminUserId: string,
    status: ValidationStatus,
    comment?: string
  ) {
    const updated = await this.validationModel
      .findByIdAndUpdate(
        validationId,
        {
          $set: {
            status,
            comment,
            reviewedByAdminId: new Types.ObjectId(adminUserId),
            reviewedAt: new Date()
          }
        },
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Validation request not found');
    }

    return updated;
  }

  async findByPharmacyId(pharmacyId: string) {
    return this.validationModel
      .findOne({ pharmacyId: new Types.ObjectId(pharmacyId) })
      .exec();
  }

  async deleteByPharmacyId(pharmacyId: string) {
    await this.validationModel
      .deleteMany({ pharmacyId: new Types.ObjectId(pharmacyId) })
      .exec();
  }
}
