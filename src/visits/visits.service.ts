import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Visit, VisitDocument } from './schemas/visit.schema';

@Injectable()
export class VisitsService {
  constructor(
    @InjectModel(Visit.name)
    private readonly visitModel: Model<VisitDocument>
  ) {}

  async logPharmacyVisit(pharmacyId: string, userId?: string) {
    if (!Types.ObjectId.isValid(pharmacyId)) {
      return;
    }

    const payload: { pharmacyId: Types.ObjectId; userId?: Types.ObjectId } = {
      pharmacyId: new Types.ObjectId(pharmacyId)
    };

    if (userId && Types.ObjectId.isValid(userId)) {
      payload.userId = new Types.ObjectId(userId);
    }

    await this.visitModel.create(payload);
  }

  async getPharmacyVisitStats(pharmacyId: string) {
    if (!Types.ObjectId.isValid(pharmacyId)) {
      return { total: 0, last7Days: 0, last30Days: 0 };
    }

    const pharmacyObjectId = new Types.ObjectId(pharmacyId);
    const now = new Date();
    const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [total, last7Days, last30Days] = await Promise.all([
      this.visitModel.countDocuments({ pharmacyId: pharmacyObjectId }).exec(),
      this.visitModel
        .countDocuments({
          pharmacyId: pharmacyObjectId,
          createdAt: { $gte: last7 }
        })
        .exec(),
      this.visitModel
        .countDocuments({
          pharmacyId: pharmacyObjectId,
          createdAt: { $gte: last30 }
        })
        .exec()
    ]);

    return { total, last7Days, last30Days };
  }
}
