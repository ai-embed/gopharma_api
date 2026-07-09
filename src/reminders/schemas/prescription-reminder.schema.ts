import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ReminderFrequency } from 'src/common/enums/domain.enums';

export type PrescriptionReminderDocument = HydratedDocument<PrescriptionReminder>;

@Schema({ timestamps: true, collection: 'prescription_reminders' })
export class PrescriptionReminder {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  medicationName!: string;

  @Prop({ required: false })
  note?: string;

  @Prop({ required: true, enum: ReminderFrequency })
  frequency!: ReminderFrequency;

  @Prop({ required: true })
  intervalHours!: number;

  @Prop({ required: true })
  startDate!: Date;

  @Prop({ required: false })
  endDate?: Date;

  @Prop({ required: true })
  nextRunAt!: Date;

  @Prop({ required: false })
  lastSentAt?: Date;

  @Prop({ required: true, default: true })
  isActive!: boolean;
}

export const PrescriptionReminderSchema = SchemaFactory.createForClass(PrescriptionReminder);
PrescriptionReminderSchema.index({ userId: 1, nextRunAt: 1 });
PrescriptionReminderSchema.index({ isActive: 1, nextRunAt: 1 });
