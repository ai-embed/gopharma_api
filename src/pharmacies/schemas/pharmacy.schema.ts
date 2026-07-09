import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AccountStatus } from 'src/common/enums/domain.enums';

export type PharmacyDocument = HydratedDocument<Pharmacy>;

@Schema({ _id: false })
export class PharmacyLocation {
  @Prop({ required: true, enum: ['Point'], default: 'Point' })
  type!: 'Point';

  @Prop({ type: [Number], required: true })
  coordinates!: [number, number];
}

@Schema({ timestamps: true, collection: 'pharmacies' })
export class Pharmacy {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  address!: string;

  @Prop({ type: PharmacyLocation, required: true })
  location!: PharmacyLocation;

  @Prop({ required: true, unique: true, trim: true })
  ifu!: string;

  @Prop({ required: false })
  email?: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ type: [String], required: false, default: [] })
  services?: string[];

  @Prop({ required: true, default: false })
  isSeeded!: boolean;

  @Prop({ required: false })
  photoUrl?: string;

  @Prop({ required: false })
  bannerUrl?: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  ownerId!: Types.ObjectId;

  @Prop({ required: true, enum: AccountStatus, default: AccountStatus.EN_ATTENTE })
  accountStatus!: AccountStatus;

  @Prop({ required: true, enum: ['OUVERT', 'FERME'], default: 'FERME' })
  operationalStatus!: 'OUVERT' | 'FERME';

  @Prop({ required: false })
  validationDate?: Date;
}

export const PharmacySchema = SchemaFactory.createForClass(Pharmacy);
PharmacySchema.index({ location: '2dsphere' });
PharmacySchema.index({ accountStatus: 1, createdAt: -1 });
