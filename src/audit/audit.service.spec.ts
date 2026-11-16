import { AuditService } from './audit.service';

describe('AuditService observability', () => {
  it('calculates real 24-hour failure metrics and returns sanitized events', async () => {
    const countDocuments = jest.fn((filter: Record<string, unknown>) => {
      const statusCode = filter.statusCode as { $gte?: number } | undefined;
      const count = !filter.outcome
        ? 20
        : statusCode?.$gte === 500
          ? 2
          : statusCode?.$gte === 400
            ? 3
            : 5;

      return { exec: jest.fn().mockResolvedValue(count) };
    });
    const distinct = jest.fn(() => ({
      exec: jest
        .fn()
        .mockResolvedValue([
          '/api/users/507f1f77bcf86cd799439011?include=private',
          '/api/users/507f1f77bcf86cd799439022',
          '/api/users/2/orders/7'
        ])
    }));

    const query = {
      sort: jest.fn(),
      limit: jest.fn(),
      select: jest.fn(),
      lean: jest.fn(),
      exec: jest.fn().mockResolvedValue([
        {
          _id: { toString: () => 'event-1' },
          createdAt: new Date('2026-04-08T10:16:00.000Z'),
          method: 'POST',
          path: '/api/users/507f1f77bcf86cd799439011?include=private',
          statusCode: 500,
          requestId: 'request-1'
        }
      ])
    };
    query.sort.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.lean.mockReturnValue(query);

    const model = {
      countDocuments,
      distinct,
      find: jest.fn().mockReturnValue(query)
    };
    const service = new AuditService(model as never);

    const result = await service.getObservability();

    expect(result).toEqual({
      totalActions: 20,
      totalErrors: 2,
      totalWarnings: 3,
      errorRate: 25,
      uniqueEndpointsAffected: 2,
      recentEvents: [
        {
          id: 'event-1',
          timestamp: '2026-04-08T10:16:00.000Z',
          level: 'error',
          message: 'Erreur serveur',
          path: '/api/users/507f1f77bcf86cd799439011',
          method: 'POST',
          statusCode: 500,
          traceId: 'request-1'
        }
      ]
    });
    expect(query.select).toHaveBeenCalledWith(
      '_id createdAt method path statusCode requestId'
    );
  });
});
