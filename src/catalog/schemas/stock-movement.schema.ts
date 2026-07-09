import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { StockMovementType } from 'src/common/enums/domain.enums';

export type StockMovementDocument = HydratedDocument<StockMovement>;

@Schema({ timestamps: true, collection: 'stock_movements' })
export class StockMovement {
  @Prop({ type: Types.ObjectId, required: true, ref: 'InventoryItem' })
  inventoryItemId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Pharmacy' })
  pharmacyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Product' })
  productId!: Types.ObjectId;

  @Prop({ required: true, enum: StockMovementType })
  type!: StockMovementType;

  @Prop({ required: true, default: 0 })
  quantityDelta!: number;

  @Prop({ required: false })
  previousPrice?: number;

  @Prop({ required: false })
  nextPrice?: number;

  @Prop({ required: false })
  description?: string;

  @Prop({ type: Types.ObjectId, required: false, ref: 'User' })
  actorUserId?: Types.ObjectId;

  @Prop({ required: true, default: Date.now })
  date!: Date;
}

export const StockMovementSchema = SchemaFactory.createForClass(StockMovement);
StockMovementSchema.index({ pharmacyId: 1, date: -1 });
