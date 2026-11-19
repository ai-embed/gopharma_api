import mongoose, { Model, Types } from 'mongoose';
import { loadBackendEnv } from '../common/testing/load-env';
import { Visit, VisitDocument, VisitSchema } from './schemas/visit.schema';
import { VisitsService } from './visits.service';

loadBackendEnv();
const describeIfMongo = process.env.MONGODB_URI_TEST ? describe : describe.skip;
jest.setTimeout(20000);

describeIfMongo('VisitsService Mongo integration', () => {
  let visitModel: Model<VisitDocument>;
  let visitsService: VisitsService;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI_TEST!, {
        serverSelectionTimeoutMS: 5000
      });
    }

    visitModel = mongoose.models.Visit || mongoose.model(Visit.name, VisitSchema);
    visitsService = new VisitsService(visitModel);
  });

  beforeEach(async () => {
    await visitModel.deleteMany({}).exec();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it('returns total and recent visit stats for a pharmacy', async () => {
    const pharmacyId = new Types.ObjectId();

    const now = Date.now();
    await visitModel.collection.insertMany([
      {
        pharmacyId,
        createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now - 2 * 24 * 60 * 60 * 1000)
      },
      {
        pharmacyId,
        createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now - 10 * 24 * 60 * 60 * 1000)
      },
      {
        pharmacyId,
        createdAt: new Date(now - 40 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now - 40 * 24 * 60 * 60 * 1000)
      }
    ]);

    const stats = await visitsService.getPharmacyVisitStats(pharmacyId.toString());

    expect(stats.total).toBe(3);
    expect(stats.last7Days).toBe(1);
    expect(stats.last30Days).toBe(2);
  });
});
