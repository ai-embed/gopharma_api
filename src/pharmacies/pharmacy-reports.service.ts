import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { PharmacyQueryDto } from './dto/pharmacy-query.dto';
import { CreatePharmacyReportDto } from './dto/create-pharmacy-report.dto';
import { ReviewPharmacyReportDto } from './dto/review-pharmacy-report.dto';
import { PharmacyReport, PharmacyReportDocument } from './schemas/pharmacy-report.schema';

@Injectable()
export class PharmacyReportsService {
  constructor(
    @InjectModel(PharmacyReport.name)
    private readonly reportModel: Model<PharmacyReportDocument>
  ) {}

  create(dto: CreatePharmacyReportDto) {
    return this.reportModel.create({
      name: dto.name.trim(),
      address: dto.address.trim(),
      phoneNumber: dto.phoneNumber?.trim(),
      location: {
        type: 'Point',
        coordinates: [dto.longitude, dto.latitude]
      },
      status: 'PENDING'
    });
  }

  listPending() {
    return this.reportModel.find({ status: 'PENDING' }).sort({ createdAt: -1 }).exec();
  }

  listPublished(query: PharmacyQueryDto) {
    if (query.openNow === true) {
      return Promise.resolve([]);
    }

    const filter: FilterQuery<PharmacyReportDocument> = { status: 'VERIFIED' };
    if (query.search?.trim()) {
      const search = new RegExp(query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: search }, { address: search }];
    }

    if (query.lat !== undefined && query.lng !== undefined) {
      const near: {
        $geometry: { type: 'Point'; coordinates: [number, number] };
        $maxDistance?: number;
        $minDistance?: number;
      } = {
        $geometry: { type: 'Point', coordinates: [query.lng, query.lat] }
      };
      const maxDistanceKm = query.maxDistanceKm ?? query.radiusKm;
      if (maxDistanceKm !== undefined) near.$maxDistance = maxDistanceKm * 1000;
      if (query.minDistanceKm !== undefined && query.minDistanceKm > 0) {
        near.$minDistance = query.minDistanceKm * 1000;
      }
      filter.location = { $near: near };
    }

    return this.reportModel.find(filter).exec();
  }

  async findPublishedById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.reportModel.findOne({ _id: id, status: 'VERIFIED' }).exec();
  }

  async review(
    reportId: string,
    adminUserId: string,
    dto: ReviewPharmacyReportDto
  ) {
    if (!Types.ObjectId.isValid(reportId)) {
      throw new NotFoundException('Pharmacy report not found');
    }

    const report = await this.reportModel
      .findOneAndUpdate(
        { _id: reportId, status: 'PENDING' },
        {
          $set: {
            status: dto.status,
            reviewComment: dto.comment?.trim(),
            reviewedByAdminId: new Types.ObjectId(adminUserId),
            reviewedAt: new Date()
          }
        },
        { new: true }
      )
      .exec();

    if (!report) throw new NotFoundException('Pending pharmacy report not found');
    return report;
  }

  asPublicPharmacy(report: PharmacyReportDocument) {
    const value = report.toObject();
    return {
      _id: value._id,
      name: value.name,
      address: value.address,
      phoneNumber: value.phoneNumber,
      location: value.location,
      isSeeded: false,
      source: 'community',
      isCommunityReported: true,
      availabilitySource: 'unknown'
    };
  }
}
