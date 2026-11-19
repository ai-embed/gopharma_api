import { plainToInstance } from 'class-transformer';
import { PharmacyQueryDto } from './dto/pharmacy-query.dto';
import { CreatePharmacyReportDto } from './dto/create-pharmacy-report.dto';
import { PharmacyReportsService } from './pharmacy-reports.service';
import { PharmacyReportDocument } from './schemas/pharmacy-report.schema';

describe('PharmacyReportsService', () => {
  const buildService = () => {
    const reportModel = {
      create: jest.fn(async (value) => value),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn()
    };
    return { service: new PharmacyReportsService(reportModel as never), reportModel };
  };

  it('stores a new report as pending with GeoJSON longitude-latitude order', async () => {
    const { service, reportModel } = buildService();
    const input = {
      name: ' Pharmacie du quartier ',
      address: ' Akpakpa, Cotonou ',
      phoneNumber: '+229 01 23 45 67',
      latitude: 6.3654,
      longitude: 2.4183
    } as CreatePharmacyReportDto;

    await service.create(input);

    expect(reportModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Pharmacie du quartier',
        address: 'Akpakpa, Cotonou',
        status: 'PENDING',
        location: { type: 'Point', coordinates: [2.4183, 6.3654] }
      })
    );
  });

  it('does not publish unverified reports in the public list', async () => {
    const { service, reportModel } = buildService();
    const query = plainToInstance(PharmacyQueryDto, { openNow: 'false' });
    const exec = jest.fn().mockResolvedValue([]);
    reportModel.find.mockReturnValue({ exec });

    await service.listPublished(query);

    expect(reportModel.find).toHaveBeenCalledWith({ status: 'VERIFIED' });
    expect(reportModel.find).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PENDING' })
    );
  });

  it('keeps hours-unknown reported pharmacies out of the open-now filter', async () => {
    const { service, reportModel } = buildService();

    await expect(
      service.listPublished(plainToInstance(PharmacyQueryDto, { openNow: 'true' }))
    ).resolves.toEqual([]);

    expect(reportModel.find).not.toHaveBeenCalled();
  });

  it('only lets admins review a pending report', async () => {
    const { service, reportModel } = buildService();
    const reviewed = { _id: 'report-id', status: 'VERIFIED' };
    reportModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(reviewed)
    });

    await expect(
      service.review(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439022',
        { status: 'VERIFIED', comment: 'Confirmée par téléphone' }
      )
    ).resolves.toBe(reviewed);

    expect(reportModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: '507f1f77bcf86cd799439011', status: 'PENDING' },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'VERIFIED',
          reviewedByAdminId: expect.anything(),
          reviewComment: 'Confirmée par téléphone'
        })
      }),
      { new: true }
    );
  });

  it('does not expose review data on published community records', () => {
    const { service } = buildService();
    const reportData = {
      _id: 'report-id',
      name: 'Pharmacie du quartier',
      address: 'Cotonou',
      phoneNumber: '+229 01 23 45 67',
      status: 'VERIFIED',
      reviewComment: 'Admin-only comment',
      reviewedByAdminId: 'private-admin',
      location: { coordinates: [2.4, 6.3] }
    };
    const report = {
      toObject: () => reportData
    } as unknown as PharmacyReportDocument;

    const published = service.asPublicPharmacy(report);
    expect(published).toMatchObject({
      source: 'community',
      isCommunityReported: true,
      availabilitySource: 'unknown'
    });
    expect(published).not.toHaveProperty('openNow');
    expect(published).not.toHaveProperty('operationalStatus');
    expect(published).not.toHaveProperty('reviewComment');
    expect(published).not.toHaveProperty('reviewedByAdminId');
  });
});

describe('PharmacyQueryDto', () => {
  it('parses false as false rather than truthy', () => {
    expect(plainToInstance(PharmacyQueryDto, { openNow: 'false' }).openNow).toBe(false);
  });
});
