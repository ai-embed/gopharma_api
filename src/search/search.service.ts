import { Injectable } from '@nestjs/common';
import { CatalogService } from '../catalog/catalog.service';
import { GeocodingService } from '../common/services/geocoding.service';
import { PharmaciesService } from '../pharmacies/pharmacies.service';
import { SchedulesService } from '../schedules/schedules.service';
import { SearchPharmaciesDto } from './dto/search-pharmacies.dto';
import { SearchMultiProductsDto } from './dto/search-multi-products.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { SearchCategoriesDto } from './dto/search-categories.dto';

@Injectable()
export class SearchService {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly geocodingService: GeocodingService,
    private readonly pharmaciesService: PharmaciesService,
    private readonly schedulesService: SchedulesService
  ) {}

  private normalizeBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
    return undefined;
  }

  async searchProducts(dto: SearchProductsDto) {
    const coordinates = await this.resolveCoordinates(dto);
    const openNow = this.normalizeBoolean(dto.openNow);
    let pharmacyIds: string[] | undefined;

    if (coordinates?.lat !== undefined && coordinates?.lng !== undefined) {
      pharmacyIds = await this.pharmaciesService.listPublicIdsByGeo({
        lat: coordinates.lat,
        lng: coordinates.lng,
        radiusKm: dto.radiusKm
      });
    }

    const inventory = await this.catalogService.searchAvailableProducts({
      query: dto.q,
      lat: coordinates?.lat,
      lng: coordinates?.lng,
      maxPrice: dto.maxPrice,
      pharmacyIds,
      category: dto.category,
      fuzzy: true
    });

    return this.filterInventoryByOpenNow(inventory, openNow);
  }

  async searchProductsMulti(dto: SearchMultiProductsDto) {
    const terms = this.normalizeMultiQuery(dto.q);
    if (terms.length === 0) {
      return [];
    }

    const coordinates = await this.resolveCoordinates(dto);
    const openNow = this.normalizeBoolean(dto.openNow);
    let pharmacyIds: string[] | undefined;

    if (coordinates?.lat !== undefined && coordinates?.lng !== undefined) {
      pharmacyIds = await this.pharmaciesService.listPublicIdsByGeo({
        lat: coordinates.lat,
        lng: coordinates.lng,
        radiusKm: dto.radiusKm
      });
    }

    const inventoryByTerm = await Promise.all(
      terms.map((term) =>
        this.catalogService.searchAvailableProducts({
          query: term,
          lat: coordinates?.lat,
          lng: coordinates?.lng,
          maxPrice: dto.maxPrice,
          pharmacyIds,
          category: dto.category,
          fuzzy: true
        })
      )
    );

    const allInventory = inventoryByTerm.flat();
    const filteredInventory = await this.filterInventoryByOpenNow(allInventory, openNow);

    const openSet = new Set(filteredInventory.map((item) => item._id.toString()));
    const results = new Map<
      string,
      { pharmacy: unknown; matchedTerms: Set<string>; matchedProducts: Set<string> }
    >();

    inventoryByTerm.forEach((items, index) => {
      const term = terms[index];
      items.forEach((item) => {
        if (!openSet.has(item._id.toString())) {
          return;
        }

        const pharmacy = item.pharmacyId as { _id?: { toString(): string } };
        const pharmacyId = pharmacy?._id?.toString();
        if (!pharmacyId) {
          return;
        }

        const product = item.productId as { name?: string };
        const existing =
          results.get(pharmacyId) ??
          ({
            pharmacy,
            matchedTerms: new Set<string>(),
            matchedProducts: new Set<string>()
          } as const);

        existing.matchedTerms.add(term);
        if (product?.name) {
          existing.matchedProducts.add(product.name);
        }

        results.set(pharmacyId, {
          pharmacy: existing.pharmacy,
          matchedTerms: existing.matchedTerms,
          matchedProducts: existing.matchedProducts
        });
      });
    });

    return Array.from(results.values())
      .map((entry) => ({
        pharmacy: entry.pharmacy,
        matchedCount: entry.matchedTerms.size,
        matchedProducts: Array.from(entry.matchedProducts)
      }))
      .sort((a, b) => {
        if (b.matchedCount !== a.matchedCount) {
          return b.matchedCount - a.matchedCount;
        }
        const nameA = (a.pharmacy as { name?: string })?.name ?? '';
        const nameB = (b.pharmacy as { name?: string })?.name ?? '';
        return nameA.localeCompare(nameB);
      });
  }

  async searchPharmacies(dto: SearchPharmaciesDto) {
    const coordinates = await this.resolveCoordinates(dto);
    const openNow = this.normalizeBoolean(dto.openNow);

    return this.pharmaciesService.listPublic({
      search: dto.q,
      lat: coordinates?.lat,
      lng: coordinates?.lng,
      radiusKm: dto.radiusKm,
      openNow
    });
  }

  async listCategories(dto: SearchCategoriesDto) {
    return this.catalogService.listCategories({ q: dto.q, limit: dto.limit });
  }

  async autocomplete(query: string, prefix?: boolean | string) {
    const parsedPrefix = this.normalizeBoolean(prefix) ?? false;
    const products = await this.catalogService.autocompleteProducts(query, {
      prefix: parsedPrefix
    });
    return products.slice(0, 10).map((p) => p.name);
  }

  private async resolveCoordinates(input: {
    address?: string;
    lat?: number;
    lng?: number;
  }) {
    if (input.lat !== undefined && input.lng !== undefined) {
      return { lat: input.lat, lng: input.lng };
    }

    return this.geocodingService.geocodeAddress(input.address);
  }

  private normalizeMultiQuery(input: string[]) {
    const terms = input
      .flatMap((value) => value.split(','))
      .map((term) => term.trim())
      .filter(Boolean)
      .map((term) => term.toLowerCase());

    return Array.from(new Set(terms));
  }

  private async filterInventoryByOpenNow<
    T extends {
      _id: { toString(): string };
      pharmacyId: {
        _id?: { toString(): string };
        operationalStatus?: 'OUVERT' | 'FERME';
        openNow?: boolean;
        nextTransitionAt?: string;
      };
    }
  >(inventory: T[], openNow?: boolean): Promise<T[]> {
    const inventoryPharmacyIds = inventory
      .map((item) => item.pharmacyId?._id?.toString())
      .filter((id): id is string => Boolean(id));

    const statuses = await this.schedulesService.getOpenStatusMap(inventoryPharmacyIds);

    const normalized: T[] = [];

    for (const item of inventory) {
      const pharmacyId = item.pharmacyId?._id?.toString();
      if (!pharmacyId) {
        continue;
      }

      const derived = statuses.get(pharmacyId);
      const isOpen = derived
        ? derived.source === 'schedule'
          ? derived.openNow
          : item.pharmacyId?.operationalStatus === 'OUVERT'
        : item.pharmacyId?.operationalStatus === 'OUVERT';
      const nextTransitionAt = derived?.source === 'schedule' ? derived.nextTransitionAt : undefined;

      if (openNow !== false && !isOpen) {
        continue;
      }

      const itemWithToObject = item as T & { toObject?: () => T };
      const pharmacyWithToObject = item.pharmacyId as T['pharmacyId'] & {
        toObject?: () => T['pharmacyId'];
      };

      const plainItem =
        typeof itemWithToObject.toObject === 'function'
          ? itemWithToObject.toObject()
          : ({ ...item } as T);
      const plainPharmacy =
        typeof pharmacyWithToObject.toObject === 'function'
          ? pharmacyWithToObject.toObject()
          : ({ ...item.pharmacyId } as T['pharmacyId']);

      normalized.push({
        ...plainItem,
        pharmacyId: {
          ...plainPharmacy,
          openNow: isOpen,
          nextTransitionAt
        }
      } as T);
    }

    return normalized;
  }
}
