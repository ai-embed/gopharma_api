import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: false })
  scientificName?: string;

  @Prop({ required: false })
  form?: string;

  @Prop({ required: false })
  strength?: string;

  @Prop({ required: false })
  laboratory?: string;

  @Prop({ required: false })
  atcCode?: string;

  @Prop({ required: false })
  country?: string;

  @Prop({ required: false })
  source?: string;

  @Prop({ required: false, unique: true, sparse: true })
  barcode?: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false })
  noticeUrl?: string;

  @Prop({ required: true, default: true })
  isMedicine!: boolean;

  @Prop({ required: false })
  category?: string;

  @Prop({ required: false })
  imageFileId?: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ name: 'text', scientificName: 'text', barcode: 'text' });
