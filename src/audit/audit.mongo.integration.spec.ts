import mongoose, { Model, Types } from 'mongoose';
import { loadBackendEnv } from 'src/common/testing/load-env';
import { AuditService } from './audit.service';
import { AuditLog, AuditLogDocument, AuditLogSchema } from './schemas/audit-log.schema';

loadBackendEnv();
const describeIfMongo = process.env.MONGODB_URI_TEST ? describe : describe.skip;
jest.setTimeout(20000);

describeIfMongo('AuditService Mongo integration', () => {
  let auditLogModel: Model<AuditLogDocument>;
  let auditService: AuditService;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI_TEST!, {
        serverSelectionTimeoutMS: 5000
      });
    }

    auditLogModel =
      mongoose.models.AuditLog || mongoose.model(AuditLog.name, AuditLogSchema);
    auditService = new AuditService(auditLogModel);
  });

  beforeEach(async () => {
    await auditLogModel.deleteMany({}).exec();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it('returns only write actions for a user activity history', async () => {
    const userId = new Types.ObjectId().toString();
    const otherUserId = new Types.ObjectId().toString();

    await auditService.record({
      actorUserId: userId,
      method: 'GET',
      path: '/api/search/products',
      outcome: 'SUCCESS',
      statusCode: 200
    });
    await auditService.record({
      actorUserId: userId,
      method: 'POST',
      path: '/api/favorites',
      outcome: 'SUCCESS',
      statusCode: 201
    });
    await auditService.record({
      actorUserId: otherUserId,
      method: 'PUT',
      path: '/api/users/me',
      outcome: 'SUCCESS',
      statusCode: 200
    });
    await auditService.record({
      actorUserId: userId,
      method: 'DELETE',
      path: '/api/history/123',
      outcome: 'SUCCESS',
      statusCode: 200
    });

    const result = await auditService.listUserActivity(userId, { page: 1, limit: 10 });

    expect(result.items).toHaveLength(2);
    const methods = result.items.map((item) => item.method).sort();
    expect(methods).toEqual(['DELETE', 'POST']);
    expect(result.items.every((item) => item.actorUserId?.toString() === userId)).toBe(true);
  });
});
