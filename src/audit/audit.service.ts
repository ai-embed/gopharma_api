import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

interface AuditLogInput {
  actorUserId?: string;
  actorRole?: string;
  method: string;
  path: string;
  outcome: 'SUCCESS' | 'ERROR';
  statusCode: number;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>
  ) {}

  async record(input: AuditLogInput) {
    const actorUserId =
      input.actorUserId && Types.ObjectId.isValid(input.actorUserId)
        ? new Types.ObjectId(input.actorUserId)
        : undefined;

    return this.auditLogModel.create({
      ...input,
      actorUserId
    });
  }

  async list(query: AuditLogQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<AuditLogDocument> = {};

    if (query.method) {
      filter.method = query.method.toUpperCase();
    }

    if (query.outcome) {
      filter.outcome = query.outcome;
    }

    if (query.actorUserId && Types.ObjectId.isValid(query.actorUserId)) {
      filter.actorUserId = new Types.ObjectId(query.actorUserId);
    }

    const [items, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.auditLogModel.countDocuments(filter).exec()
    ]);

    return {
      items,
      page,
      limit,
      total
    };
  }

  async listUserActivity(
    actorUserId: string,
    query: { page?: number; limit?: number }
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<AuditLogDocument> = {
      actorUserId: new Types.ObjectId(actorUserId),
      method: { $in: ['POST', 'PUT', 'PATCH', 'DELETE'] }
    };

    const [items, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.auditLogModel.countDocuments(filter).exec()
    ]);

    return {
      items,
      page,
      limit,
      total
    };
  }
}
