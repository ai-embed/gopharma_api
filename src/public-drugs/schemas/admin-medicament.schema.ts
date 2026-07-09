import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AdminMedicamentDocument = HydratedDocument<AdminMedicament>;

@Schema({ timestamps: true, collection: 'admin_medicaments' })
export class AdminMedicament {
  @Prop({ required: false, trim: true, maxlength: 64 })
  externalProductId?: string;

  @Prop({ required: true, trim: true, maxlength: 180 })
  name!: string;

  @Prop({ required: false, trim: true, maxlength: 180 })
  scientificName?: string;

  @Prop({ required: false, trim: true, maxlength: 120 })
  category?: string;

  @Prop({ required: false, trim: true, maxlength: 64 })
  barcode?: string;

  @Prop({ required: false, trim: true, maxlength: 120 })
  form?: string;

  @Prop({ required: false, trim: true, maxlength: 120 })
  strength?: string;

  @Prop({ required: false, trim: true, maxlength: 180 })
  laboratory?: string;

  @Prop({ required: false, trim: true, maxlength: 40 })
  atcCode?: string;

  @Prop({ required: false, trim: true, maxlength: 80 })
  country?: string;

  @Prop({ required: false, trim: true, maxlength: 120 })
  source?: string;

  @Prop({ required: false, trim: true, maxlength: 64 })
  sourcePharmacyId?: string;

  @Prop({ required: false, trim: true, maxlength: 180 })
  sourcePharmacyName?: string;
}

export const AdminMedicamentSchema = SchemaFactory.createForClass(AdminMedicament);
AdminMedicamentSchema.index({
  name: 'text',
  scientificName: 'text',
  category: 'text',
  barcode: 'text',
  form: 'text',
  strength: 'text',
  laboratory: 'text',
  atcCode: 'text',
  country: 'text',
  source: 'text',
  sourcePharmacyName: 'text'
});
AdminMedicamentSchema.index({ externalProductId: 1 }, { unique: true, sparse: true });
