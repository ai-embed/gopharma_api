import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PharmacyReportDocument = HydratedDocument<PharmacyReport>;

@Schema({ _id: false })
class PharmacyReportLocation {
  @Prop({ required: true, enum: ['Point'], default: 'Point' })
  type!: 'Point';

  @Prop({ type: [Number], required: true })
  coordinates!: [number, number];
}

@Schema({ timestamps: true, collection: 'pharmacy_reports' })
export class PharmacyReport {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  address!: string;

  @Prop({ required: false, trim: true })
  phoneNumber?: string;

  @Prop({ type: PharmacyReportLocation, required: true })
  location!: PharmacyReportLocation;

  @Prop({ required: true, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING' })
  status!: 'PENDING' | 'VERIFIED' | 'REJECTED';

  @Prop({ type: Types.ObjectId, required: false, ref: 'User' })
  reviewedByAdminId?: Types.ObjectId;

  @Prop({ required: false })
  reviewedAt?: Date;

  @Prop({ required: false, trim: true })
  reviewComment?: string;

  createdAt?: Date;
}

export const PharmacyReportSchema = SchemaFactory.createForClass(PharmacyReport);
PharmacyReportSchema.index({ status: 1, createdAt: -1 });
PharmacyReportSchema.index({ location: '2dsphere' });
