import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Role } from '../../common/enums/domain.enums';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ type: Types.ObjectId, required: false, ref: 'User' })
  actorUserId?: Types.ObjectId;

  @Prop({ required: false, enum: Role })
  actorRole?: Role;

  @Prop({ required: true })
  method!: string;

  @Prop({ required: true })
  path!: string;

  @Prop({ required: true })
  outcome!: 'SUCCESS' | 'ERROR';

  @Prop({ required: true })
  statusCode!: number;

  @Prop({ required: false })
  ip?: string;

  @Prop({ required: false })
  userAgent?: string;

  @Prop({ required: false })
  requestId?: string;

  @Prop({ required: false })
  errorMessage?: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: false })
  metadata?: Record<string, unknown>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actorUserId: 1, createdAt: -1 });
