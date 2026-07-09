import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RefreshTokenBlacklistDocument = HydratedDocument<RefreshTokenBlacklist>;

@Schema({ timestamps: true, collection: 'refresh_token_blacklist' })
export class RefreshTokenBlacklist {
  @Prop({ required: true })
  tokenId!: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  expiresAt!: Date;
}

export const RefreshTokenBlacklistSchema = SchemaFactory.createForClass(
  RefreshTokenBlacklist
);
RefreshTokenBlacklistSchema.index({ tokenId: 1 }, { unique: true });
RefreshTokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
