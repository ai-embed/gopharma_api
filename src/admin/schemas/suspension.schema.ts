import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SuspensionDocument = HydratedDocument<Suspension>;

@Schema({ timestamps: true, collection: 'suspensions' })
export class Suspension {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  targetUserId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false, ref: 'Pharmacy' })
  targetPharmacyId?: Types.ObjectId;

  @Prop({ required: true })
  reason!: string;

  @Prop({ required: true })
  startDate!: Date;

  @Prop({ required: false })
  endDate?: Date;

  @Prop({ required: true, default: true })
  isActive!: boolean;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  createdByAdminId!: Types.ObjectId;
}

export const SuspensionSchema = SchemaFactory.createForClass(Suspension);
SuspensionSchema.index({ targetUserId: 1, isActive: 1 });
