import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { FavoriteTargetType } from '../../common/enums/domain.enums';

export type FavoriteDocument = HydratedDocument<Favorite>;

@Schema({ timestamps: true, collection: 'favorites' })
export class Favorite {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, enum: FavoriteTargetType })
  targetType!: FavoriteTargetType;

  @Prop({ type: Types.ObjectId, required: false, ref: 'Pharmacy' })
  pharmacyId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false, ref: 'Product' })
  productId?: Types.ObjectId;
}

export const FavoriteSchema = SchemaFactory.createForClass(Favorite);
FavoriteSchema.index(
  {
    userId: 1,
    targetType: 1,
    pharmacyId: 1,
    productId: 1
  },
  { unique: true }
);
