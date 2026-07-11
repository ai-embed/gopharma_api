import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ValidationStatus } from '../../common/enums/domain.enums';

export type PharmacyValidationDocument = HydratedDocument<PharmacyValidation>;

@Schema({ timestamps: true, collection: 'pharmacy_validations' })
export class PharmacyValidation {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Pharmacy' })
  pharmacyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  requestedByUserId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false, ref: 'User' })
  reviewedByAdminId?: Types.ObjectId;

  @Prop({ required: true, enum: ValidationStatus, default: ValidationStatus.EN_ATTENTE })
  status!: ValidationStatus;

  @Prop({ required: false })
  comment?: string;

  @Prop({ type: [String], default: [] })
  documents!: string[];

  @Prop({ required: false })
  reviewedAt?: Date;
}

export const PharmacyValidationSchema = SchemaFactory.createForClass(
  PharmacyValidation
);
PharmacyValidationSchema.index({ status: 1, createdAt: -1 });
