import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Product, ProductDocument } from '../catalog/schemas/product.schema';
import { PUBLIC_DRUGS_SAMPLE, PublicDrugRecord } from './public-drugs.sample';
import { PublicDrugsSort } from './dto/public-drugs-query.dto';
import {
  AdminMedicament,
  AdminMedicamentDocument
} from './schemas/admin-medicament.schema';

interface PublicDrugProviderResponse {
  items: PublicDrugRecord[];
  total: number;
  limit: number;
  offset: number;
}

interface SyncFromManagerProductInput {
  externalProductId: string;
  name: string;
  scientificName?: string;
  category?: string;
  barcode?: string;
  form?: string;
  strength?: string;
  laboratory?: string;
  atcCode?: string;
  country?: string;
  source?: string;
  sourcePharmacyId?: string;
  sourcePharmacyName?: string;
}

@Injectable()
export class PublicDrugsService {
  private readonly logger = new Logger(PublicDrugsService.name);
  private readonly defaultSource = 'GoPharma Admin';

  constructor(
    @InjectModel(AdminMedicament.name)
    private readonly adminMedicamentModel: Model<AdminMedicamentDocument>,
    @Optional()
    @InjectModel(Product.name)
    private readonly productModel?: Model<ProductDocument>
  ) {}

  async search(input: {
    q?: string;
    limit: number;
    offset: number;
    form?: string;
    sort?: PublicDrugsSort;
  }) {
    const catalogResult = await this.searchCatalog(input);
    if (catalogResult) {
      return catalogResult;
    }

    const apiUrl = process.env.PUBLIC_DRUGS_API_URL;
    if (!apiUrl) {
      return this.searchLocal(input);
    }

    try {
      const url = new URL(apiUrl);
      if (input.q) {
        url.searchParams.set('q', input.q);
      }
      if (input.form) {
        url.searchParams.set('form', input.form);
      }
      if (input.sort) {
        url.searchParams.set('sort', input.sort);
      }
      url.searchParams.set('limit', String(input.limit));
      url.searchParams.set('offset', String(input.offset));

      const response = await fetch(url.toString(), {
        headers: this.buildHeaders(),
        signal: this.buildAbortSignal()
      });

      if (!response.ok) {
        this.logger.warn(`Public drugs API error ${response.status}`);
        return this.searchLocal(input);
      }

      const data = (await response.json()) as unknown;
      return this.normalizeProviderResponse(data, input);
    } catch (error) {
      this.logger.warn(
        `Public drugs API request failed: ${(error as Error).message}`
      );
      return this.searchLocal(input);
    }
  }

  async createCatalogEntry(input: {
    name: string;
    scientificName?: string;
    category?: string;
    barcode?: string;
    form?: string;
    strength?: string;
    laboratory?: string;
    atcCode?: string;
    country?: string;
    source?: string;
  }): Promise<PublicDrugRecord> {
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException('Le nom du médicament est obligatoire.');
    }

    const created = await this.adminMedicamentModel.create({
      name,
      scientificName: this.sanitizeOptional(input.scientificName),
      category: this.sanitizeOptional(input.category),
      barcode: this.sanitizeOptional(input.barcode),
      form: this.sanitizeOptional(input.form),
      strength: this.sanitizeOptional(input.strength),
      laboratory: this.sanitizeOptional(input.laboratory),
      atcCode: this.sanitizeOptional(input.atcCode),
      country: this.sanitizeOptional(input.country),
      source: this.sanitizeOptional(input.source) ?? this.defaultSource
    });

    return this.toPublicDrugRecord(created);
  }

  async updateCatalogEntry(
    id: string,
    input: {
      name?: string;
      scientificName?: string;
      category?: string;
      barcode?: string;
      form?: string;
      strength?: string;
      laboratory?: string;
      atcCode?: string;
      country?: string;
      source?: string;
    }
  ): Promise<PublicDrugRecord> {
    if (!id) {
      throw new BadRequestException('Identifiant médicament invalide.');
    }

    const setPayload: Partial<AdminMedicament> = {};
    const unsetPayload: Record<string, 1> = {};
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        throw new BadRequestException('Le nom du médicament ne peut pas être vide.');
      }
      setPayload.name = name;
    }

    const writeField = (
      key: keyof Pick<
        AdminMedicament,
        | 'scientificName'
        | 'category'
        | 'barcode'
        | 'form'
        | 'strength'
        | 'laboratory'
        | 'atcCode'
        | 'country'
        | 'source'
      >,
      value: string | undefined
    ) => {
      if (value === undefined) return;
      const sanitized = this.sanitizeOptional(value);
      if (sanitized) {
        setPayload[key] = sanitized;
        return;
      }
      unsetPayload[key] = 1;
    };

    writeField('scientificName', input.scientificName);
    writeField('category', input.category);
    writeField('barcode', input.barcode);
    writeField('form', input.form);
    writeField('strength', input.strength);
    writeField('laboratory', input.laboratory);
    writeField('atcCode', input.atcCode);
    writeField('country', input.country);
    writeField('source', input.source);

    if (Object.keys(setPayload).length === 0 && Object.keys(unsetPayload).length === 0) {
      throw new BadRequestException('Aucune modification à appliquer.');
    }

    const updated = await this.adminMedicamentModel
      .findByIdAndUpdate(
        id,
        {
          ...(Object.keys(setPayload).length > 0 ? { $set: setPayload } : {}),
          ...(Object.keys(unsetPayload).length > 0 ? { $unset: unsetPayload } : {})
        },
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Médicament introuvable.');
    }

    return this.toPublicDrugRecord(updated);
  }

  async getCatalogEntryById(id: string): Promise<PublicDrugRecord> {
    if (!id) {
      throw new BadRequestException('Identifiant médicament invalide.');
    }

    const medicament = await this.adminMedicamentModel.findById(id).lean().exec();
    if (!medicament) {
      throw new NotFoundException('Médicament introuvable.');
    }

    return this.toPublicDrugRecord(medicament);
  }

  async deleteCatalogEntry(id: string): Promise<{ success: true }> {
    if (!id) {
      throw new BadRequestException('Identifiant médicament invalide.');
    }

    const deleted = await this.adminMedicamentModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException('Médicament introuvable.');
    }

    return { success: true };
  }

  async upsertCatalogEntryFromManagerProduct(
    input: SyncFromManagerProductInput
  ): Promise<PublicDrugRecord> {
    const externalProductId = input.externalProductId?.trim();
    const name = input.name?.trim();

    if (!externalProductId) {
      throw new BadRequestException('Identifiant produit externe invalide.');
    }

    if (!name) {
      throw new BadRequestException('Le nom du médicament est obligatoire.');
    }

    const synced = await this.adminMedicamentModel
      .findOneAndUpdate(
        { externalProductId },
        {
          $set: {
            externalProductId,
            name,
            scientificName: this.sanitizeOptional(input.scientificName),
            category: this.sanitizeOptional(input.category),
            barcode: this.sanitizeOptional(input.barcode),
            form: this.sanitizeOptional(input.form) ?? this.sanitizeOptional(input.category),
            strength: this.sanitizeOptional(input.strength),
            laboratory:
              this.sanitizeOptional(input.laboratory) ??
              this.sanitizeOptional(input.scientificName),
            atcCode: this.sanitizeOptional(input.atcCode),
            country: this.sanitizeOptional(input.country),
            source: this.sanitizeOptional(input.source) ?? 'Catalogue pharmacies',
            sourcePharmacyId: this.sanitizeOptional(input.sourcePharmacyId),
            sourcePharmacyName: this.sanitizeOptional(input.sourcePharmacyName)
          }
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      )
      .exec();

    return this.toPublicDrugRecord(synced);
  }

  async cleanupOrphanCatalogEntries() {
    const catalogEntries = await this.adminMedicamentModel
      .find(
        { externalProductId: { $exists: true, $ne: null } },
        { _id: 1, externalProductId: 1 }
      )
      .lean()
      .exec();
    if (catalogEntries.length === 0) {
      return { deletedCount: 0 };
    }

    if (!this.productModel) {
      return { deletedCount: 0 };
    }

    const existingProductIds = await this.productModel.find({}, { _id: 1 }).lean().exec();
    const existingSet = new Set(existingProductIds.map((item) => item._id.toString()));

    const orphanCatalogIds = catalogEntries
      .filter(
        (entry) => entry.externalProductId && !existingSet.has(entry.externalProductId)
      )
      .map((entry) => entry._id);

    if (orphanCatalogIds.length === 0) {
      return { deletedCount: 0 };
    }

    const deletion = await this.adminMedicamentModel
      .deleteMany({ _id: { $in: orphanCatalogIds } })
      .exec();

    return { deletedCount: deletion.deletedCount ?? 0 };
  }

  private searchLocal(input: {
    q?: string;
    limit: number;
    offset: number;
    form?: string;
    sort?: PublicDrugsSort;
  }) {
    const term = input.q?.trim().toLowerCase();
    let filtered = term
      ? PUBLIC_DRUGS_SAMPLE.filter((item) =>
          [
            item.name,
            item.id,
            item.scientificName,
            item.category,
            item.barcode,
            item.atcCode,
            item.sourcePharmacyName
          ]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(term))
        )
      : PUBLIC_DRUGS_SAMPLE;

    if (input.form) {
      filtered = filtered.filter(
        (item) => (item.form ?? '').toLowerCase() === input.form?.toLowerCase()
      );
    }

    const sort = input.sort ?? 'NAME_ASC';
    filtered = [...filtered].sort((left, right) =>
      sort === 'NAME_ASC'
        ? left.name.localeCompare(right.name, 'fr')
        : right.name.localeCompare(left.name, 'fr')
    );

    const total = filtered.length;
    const items = filtered.slice(input.offset, input.offset + input.limit);

    return {
      items,
      total,
      limit: input.limit,
      offset: input.offset
    };
  }

  private async searchCatalog(input: {
    q?: string;
    limit: number;
    offset: number;
    form?: string;
    sort?: PublicDrugsSort;
  }) {
    const catalogCount = await this.adminMedicamentModel.estimatedDocumentCount().exec();
    if (catalogCount === 0) return null;

    const filter: FilterQuery<AdminMedicamentDocument> = {};
    const term = input.q?.trim();
    if (term) {
      const escaped = this.escapeRegExp(term);
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { name: regex },
        { scientificName: regex },
        { category: regex },
        { barcode: regex },
        { form: regex },
        { strength: regex },
        { laboratory: regex },
        { atcCode: regex },
        { country: regex },
        { source: regex },
        { sourcePharmacyName: regex }
      ];
    }

    if (input.form) {
      filter.form = new RegExp(`^${this.escapeRegExp(input.form)}$`, 'i');
    }

    const sortOrder = (input.sort ?? 'NAME_ASC') === 'NAME_ASC' ? 1 : -1;
    const [items, total] = await Promise.all([
      this.adminMedicamentModel
        .find(filter)
        .sort({ name: sortOrder, _id: 1 })
        .skip(input.offset)
        .limit(input.limit)
        .lean()
        .exec(),
      this.adminMedicamentModel.countDocuments(filter).exec()
    ]);

    return {
      items: items.map((item) => this.toPublicDrugRecord(item)),
      total,
      limit: input.limit,
      offset: input.offset
    };
  }

  private toPublicDrugRecord(
    item: Pick<
      AdminMedicament,
      | 'externalProductId'
      | 'name'
      | 'scientificName'
      | 'category'
      | 'barcode'
      | 'form'
      | 'strength'
      | 'laboratory'
      | 'atcCode'
      | 'country'
      | 'source'
      | 'sourcePharmacyId'
      | 'sourcePharmacyName'
    > & { _id?: { toString(): string } | string }
  ): PublicDrugRecord {
    return {
      id:
        typeof item._id === 'string'
          ? item._id
          : item._id?.toString() ?? `local-${item.name.toLowerCase()}`,
      name: item.name,
      scientificName: item.scientificName,
      category: item.category,
      barcode: item.barcode,
      form: item.form,
      strength: item.strength,
      laboratory: item.laboratory,
      atcCode: item.atcCode,
      country: item.country,
      source: item.source ?? this.defaultSource,
      sourcePharmacyId: item.sourcePharmacyId,
      sourcePharmacyName: item.sourcePharmacyName
    };
  }

  private sanitizeOptional(value?: string) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private normalizeProviderResponse(
    data: unknown,
    input: {
      limit: number;
      offset: number;
      form?: string;
      sort?: PublicDrugsSort;
    }
  ): PublicDrugProviderResponse {
    const payload = data as {
      items?: PublicDrugRecord[];
      results?: PublicDrugRecord[];
      data?: PublicDrugRecord[];
      total?: number;
      count?: number;
    };
    let items = payload.items ?? payload.results ?? payload.data ?? PUBLIC_DRUGS_SAMPLE;

    if (input.form) {
      items = items.filter(
        (item) => (item.form ?? '').toLowerCase() === input.form?.toLowerCase()
      );
    }

    const sort = input.sort ?? 'NAME_ASC';
    items = [...items].sort((left, right) =>
      sort === 'NAME_ASC'
        ? left.name.localeCompare(right.name, 'fr')
        : right.name.localeCompare(left.name, 'fr')
    );

    const providerTotal = payload.total ?? payload.count;
    return {
      items,
      total: input.form ? items.length : providerTotal ?? items.length,
      limit: input.limit,
      offset: input.offset
    };
  }

  private buildHeaders() {
    const headers: Record<string, string> = {};
    const apiKey = process.env.PUBLIC_DRUGS_API_KEY;
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    return headers;
  }

  private buildAbortSignal() {
    const timeoutMs = Number(process.env.PUBLIC_DRUGS_TIMEOUT_MS ?? 4000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    timeout.unref?.();
    return controller.signal;
  }
}
