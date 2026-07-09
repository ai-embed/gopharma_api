import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ManagerCategoryDocument = HydratedDocument<ManagerCategory>;

@Schema({ timestamps: true, collection: 'manager_categories' })
export class ManagerCategory {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  managerUserId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  normalizedName!: string;
}

export const ManagerCategorySchema = SchemaFactory.createForClass(ManagerCategory);
ManagerCategorySchema.index({ managerUserId: 1, normalizedName: 1 }, { unique: true });
