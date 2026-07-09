import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PushTokenDocument = HydratedDocument<PushToken>;

@Schema({ timestamps: true, collection: 'push_tokens' })
export class PushToken {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  token!: string;

  @Prop({ required: false, trim: true })
  platform?: string;
}

export const PushTokenSchema = SchemaFactory.createForClass(PushToken);
PushTokenSchema.index({ userId: 1, createdAt: -1 });
