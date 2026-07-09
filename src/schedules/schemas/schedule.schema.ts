import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ScheduleDocument = HydratedDocument<Schedule>;

@Schema({ _id: false })
export class WeeklySlot {
  @Prop({ required: true, min: 0, max: 6 })
  dayOfWeek!: number;

  @Prop({ required: false })
  openTime?: string;

  @Prop({ required: false })
  closeTime?: string;

  @Prop({ required: true, default: false })
  isClosed!: boolean;

  @Prop({ required: true, default: false })
  onDuty!: boolean;
}

@Schema({ _id: false })
export class ExceptionSlot {
  @Prop({ required: true })
  startDate!: Date;

  @Prop({ required: true })
  endDate!: Date;

  @Prop({ required: true, default: false })
  isClosed!: boolean;

  @Prop({ required: true, default: false })
  onDuty!: boolean;

  @Prop({ required: false })
  openTime?: string;

  @Prop({ required: false })
  closeTime?: string;

  @Prop({ required: false })
  label?: string;
}

@Schema({ timestamps: true, collection: 'schedules' })
export class Schedule {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Pharmacy', unique: true })
  pharmacyId!: Types.ObjectId;

  @Prop({ type: [WeeklySlot], default: [] })
  weekly!: WeeklySlot[];

  @Prop({ type: [ExceptionSlot], default: [] })
  exceptions!: ExceptionSlot[];

  @Prop({ type: Types.ObjectId, required: false, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const ScheduleSchema = SchemaFactory.createForClass(Schedule);
