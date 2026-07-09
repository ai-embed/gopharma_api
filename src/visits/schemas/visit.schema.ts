import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type VisitDocument = HydratedDocument<Visit>;

@Schema({ timestamps: true, collection: 'visits' })
export class Visit {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Pharmacy' })
  pharmacyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false, ref: 'User' })
  userId?: Types.ObjectId;
}

export const VisitSchema = SchemaFactory.createForClass(Visit);
VisitSchema.index({ pharmacyId: 1, createdAt: -1 });
