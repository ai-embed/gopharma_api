import mongoose, { Model } from 'mongoose';
import { AccountStatus } from '../common/enums/domain.enums';
import { loadBackendEnv } from '../common/testing/load-env';
import { Pharmacy, PharmacyDocument, PharmacySchema } from '../pharmacies/schemas/pharmacy.schema';
import { PharmaciesService } from '../pharmacies/pharmacies.service';
import { SchedulesService } from '../schedules/schedules.service';
import { Schedule, ScheduleDocument, ScheduleSchema } from '../schedules/schemas/schedule.schema';
import { SearchService } from './search.service';

loadBackendEnv();
const describeIfMongo = process.env.MONGODB_URI_TEST ? describe : describe.skip;
jest.setTimeout(20000);

describeIfMongo('SearchService Mongo integration', () => {
  let pharmacyModel: Model<PharmacyDocument>;
  let scheduleModel: Model<ScheduleDocument>;
  let schedulesService: SchedulesService;
  let pharmaciesService: PharmaciesService;
  let searchService: SearchService;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI_TEST!, {
        serverSelectionTimeoutMS: 5000
      });
    }

    pharmacyModel = mongoose.models.Pharmacy || mongoose.model(Pharmacy.name, PharmacySchema);
    scheduleModel = mongoose.models.Schedule || mongoose.model(Schedule.name, ScheduleSchema);

    const cloudinaryService = {
      uploadImage: jest.fn(),
      deleteImage: jest.fn(),
    } as never;

    schedulesService = new SchedulesService({} as never, scheduleModel);
    pharmaciesService = new PharmaciesService(schedulesService, pharmacyModel, cloudinaryService);
    searchService = new SearchService(
      {} as never,
      { geocodeAddress: jest.fn() } as never,
      pharmaciesService,
      schedulesService
    );
  });

  beforeEach(async () => {
    await Promise.all([pharmacyModel.deleteMany({}).exec(), scheduleModel.deleteMany({}).exec()]);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it('returns only pharmacies currently open when openNow=true', async () => {
    const dayOfWeek = new Date().getUTCDay();
    const openPharmacy = await pharmacyModel.create({
      name: 'Pharmacie Ouverte',
      address: 'Cotonou Centre',
      location: { type: 'Point', coordinates: [2.4, 6.3] },
      ifu: 'IFU-SEARCH-OPEN',
      ownerId: new mongoose.Types.ObjectId(),
      accountStatus: AccountStatus.VALIDE,
      operationalStatus: 'FERME'
    });
    const closedPharmacy = await pharmacyModel.create({
      name: 'Pharmacie Fermee',
      address: 'Porto-Novo',
      location: { type: 'Point', coordinates: [2.6, 6.5] },
      ifu: 'IFU-SEARCH-CLOSED',
      ownerId: new mongoose.Types.ObjectId(),
      accountStatus: AccountStatus.VALIDE,
      operationalStatus: 'OUVERT'
    });

    await scheduleModel.create({
      pharmacyId: openPharmacy._id,
      weekly: [{ dayOfWeek, openTime: '00:00', closeTime: '23:59', isClosed: false, onDuty: false }],
      exceptions: []
    });
    await scheduleModel.create({
      pharmacyId: closedPharmacy._id,
      weekly: [{ dayOfWeek, isClosed: true, onDuty: false }],
      exceptions: []
    });

    const results = await searchService.searchPharmacies({
      q: 'Pharmacie',
      openNow: true
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe('Pharmacie Ouverte');
    expect(results[0]?.openNow).toBe(true);
    expect(results[0]?.availabilitySource).toBe('schedule');
  });
});
