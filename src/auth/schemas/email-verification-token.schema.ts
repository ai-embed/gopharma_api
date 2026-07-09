import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EmailVerificationTokenDocument = HydratedDocument<EmailVerificationToken>;

@Schema({
  timestamps: true,
  collection: 'email_verification_tokens'
})
export class EmailVerificationToken {
  @Prop({ type: Types.ObjectId, required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  tokenHash!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ required: false })
  usedAt?: Date;
}

export const EmailVerificationTokenSchema = SchemaFactory.createForClass(
  EmailVerificationToken
);
