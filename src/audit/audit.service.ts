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

export interface AuditObservabilityEvent {
  id: string;
  timestamp: string;
  level: 'error' | 'warn';
  message: string;
  path: string;
  method: string;
  statusCode: number;
  traceId: string;
}

export interface AuditObservabilitySummary {
  totalActions: number;
  totalErrors: number;
  totalWarnings: number;
  errorRate: number;
  uniqueEndpointsAffected: number;
  recentEvents: AuditObservabilityEvent[];
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

  async getObservability(): Promise<AuditObservabilitySummary> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const windowFilter = { createdAt: { $gte: since } };
    const errorFilter = { ...windowFilter, outcome: 'ERROR' as const };

    const [
      totalActions,
      failedActions,
      totalErrors,
      totalWarnings,
      affectedPaths,
      recentLogs
    ] = await Promise.all([
      this.auditLogModel.countDocuments(windowFilter).exec(),
      this.auditLogModel.countDocuments(errorFilter).exec(),
      this.auditLogModel
        .countDocuments({ ...errorFilter, statusCode: { $gte: 500 } })
        .exec(),
      this.auditLogModel
        .countDocuments({
          ...errorFilter,
          statusCode: { $gte: 400, $lt: 500 }
        })
        .exec(),
      this.auditLogModel.distinct('path', errorFilter).exec(),
      this.auditLogModel
        .find(errorFilter)
        .sort({ createdAt: -1 })
        .limit(50)
        .select('_id createdAt method path statusCode requestId')
        .lean()
        .exec()
    ]);

    const endpoints = new Set(
      affectedPaths.map((path) =>
        String(path)
          .split('?')[0]
          .replace(/[0-9a-f]{24}/gi, ':id')
          .replace(/[0-9a-f-]{36}/gi, ':id')
          .replace(/\/\d+(?=\/|$)/g, '/:id')
      )
    );

    return {
      totalActions,
      totalErrors,
      totalWarnings,
      errorRate:
        totalActions === 0
          ? 0
          : Math.round((failedActions / totalActions) * 1000) / 10,
      uniqueEndpointsAffected: endpoints.size,
      recentEvents: recentLogs.map((log) => ({
        id: log._id.toString(),
        timestamp: new Date(log.createdAt).toISOString(),
        level: log.statusCode >= 500 ? 'error' : 'warn',
        message:
          log.statusCode >= 500
            ? 'Erreur serveur'
            : 'Requête rejetée par le serveur',
        path: String(log.path).split('?')[0],
        method: log.method,
        statusCode: log.statusCode,
        traceId: log.requestId ?? log._id.toString()
      }))
    };
  }
}
