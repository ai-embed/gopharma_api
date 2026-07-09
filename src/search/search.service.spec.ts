import { SearchService } from './search.service';

describe('SearchService', () => {
  it('geocodes an address before searching pharmacies when lat/lng are absent', async () => {
    const geocodingService = {
      geocodeAddress: jest.fn(async () => ({ lat: 6.37, lng: 2.42 }))
    };
    const pharmaciesService = {
      listPublic: jest.fn(async () => [])
    };

    const service = new SearchService(
      {} as never,
      geocodingService as never,
      pharmaciesService as never,
      {} as never
    );

    await service.searchPharmacies({
      q: 'Pharmacie',
      address: 'Cotonou, Benin'
    });

    expect(geocodingService.geocodeAddress).toHaveBeenCalledWith('Cotonou, Benin');
    expect(pharmaciesService.listPublic).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'Pharmacie',
        lat: 6.37,
        lng: 2.42
      })
    );
  });

  it('passes through explicit coordinates without geocoding', async () => {
    const geocodingService = {
      geocodeAddress: jest.fn()
    };
    const catalogService = {
      searchAvailableProducts: jest.fn(async () => [])
    };
    const pharmaciesService = {
      listPublicIdsByGeo: jest.fn(async () => ['pharmacy-1'])
    };

    const service = new SearchService(
      catalogService as never,
      geocodingService as never,
      pharmaciesService as never,
      { getOpenStatusMap: jest.fn(async () => new Map()) } as never
    );

    await service.searchProducts({
      q: 'Paracetamol',
      lat: 6.36,
      lng: 2.41
    });

    expect(geocodingService.geocodeAddress).not.toHaveBeenCalled();
    expect(pharmaciesService.listPublicIdsByGeo).toHaveBeenCalledWith({
      lat: 6.36,
      lng: 2.41,
      radiusKm: undefined
    });
    expect(catalogService.searchAvailableProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        lat: 6.36,
        lng: 2.41,
        category: undefined,
        fuzzy: true
      })
    );
  });
});
