import { PublicDrugsService } from './public-drugs.service';

describe('PublicDrugsService', () => {
  it('returns sample items when no API URL is configured', async () => {
    const service = new PublicDrugsService({
      estimatedDocumentCount: jest.fn(() => ({ exec: jest.fn(async () => 0) }))
    } as never);

    const result = await service.search({ q: 'Paracetamol', limit: 10, offset: 0 });

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0]?.name).toContain('PARACETAMOL');
  });
});
