import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  NotificationChannel,
  NotificationType
} from 'src/common/enums/domain.enums';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, enum: NotificationType })
  type!: NotificationType;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  message!: string;

  @Prop({ required: true, default: Date.now })
  sentAt!: Date;

  @Prop({ required: true, default: false })
  isRead!: boolean;

  @Prop({ type: [String], enum: NotificationChannel, default: [NotificationChannel.IN_APP] })
  channels!: NotificationChannel[];

  @Prop({ type: Object, required: false })
  metadata?: Record<string, unknown>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, sentAt: -1 });
