import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InventoryItemDocument = HydratedDocument<InventoryItem>;

@Schema({ timestamps: true, collection: 'inventory_items' })
export class InventoryItem {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Pharmacy' })
  pharmacyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Product' })
  productId!: Types.ObjectId;

  @Prop({ required: true })
  price!: number;

  @Prop({ required: true, default: 0 })
  stockQuantity!: number;

  @Prop({ required: true, default: 5 })
  alertThreshold!: number;

  @Prop({ required: true, default: true })
  isAvailable!: boolean;

  @Prop({ required: false })
  expiryDate?: Date;

  @Prop({ required: true, default: Date.now })
  lastUpdatedAt!: Date;
}

export const InventoryItemSchema = SchemaFactory.createForClass(InventoryItem);
InventoryItemSchema.index({ pharmacyId: 1, productId: 1 }, { unique: true });
InventoryItemSchema.index({ pharmacyId: 1, stockQuantity: 1 });
