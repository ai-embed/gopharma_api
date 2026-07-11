import {
  Optional,
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationType, StockMovementType } from '../common/enums/domain.enums';
import { FavoritesService } from '../favorites/favorites.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PharmaciesService } from '../pharmacies/pharmacies.service';
import { PublicDrugsService } from '../public-drugs/public-drugs.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdatePriceDto } from './dto/update-price.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { InventoryItem, InventoryItemDocument } from './schemas/inventory-item.schema';
import {
  ManagerCategory,
  ManagerCategoryDocument
} from './schemas/manager-category.schema';
import { Product, ProductDocument } from './schemas/product.schema';
import { StockMovement, StockMovementDocument } from './schemas/stock-movement.schema';

@Injectable()
export class CatalogService {
  constructor(
    private readonly pharmaciesService: PharmaciesService,
    private readonly favoritesService: FavoritesService,
    private readonly notificationsService: NotificationsService,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(InventoryItem.name)
    private readonly inventoryModel: Model<InventoryItemDocument>,
    @InjectModel(StockMovement.name)
    private readonly movementModel: Model<StockMovementDocument>,
    @InjectModel(ManagerCategory.name)
    private readonly managerCategoryModel: Model<ManagerCategoryDocument>,
    @Optional()
    private readonly publicDrugsService?: PublicDrugsService
  ) {}

  private async syncAdminMedicamentFromProduct(
    product: ProductDocument,
    pharmacy?: { _id: { toString(): string }; name: string }
  ) {
    if (!this.publicDrugsService) {
      return;
    }

    await this.publicDrugsService.upsertCatalogEntryFromManagerProduct({
      externalProductId: product._id.toString(),
      name: product.name,
      scientificName: product.scientificName,
      category: product.category,
      barcode: product.barcode,
      form: product.form,
      strength: product.strength,
      laboratory: product.laboratory,
      atcCode: product.atcCode,
      country: product.country,
      source: product.source ?? 'Catalogue pharmacies',
      sourcePharmacyId: pharmacy?._id.toString(),
      sourcePharmacyName: pharmacy?.name
    });
  }

  private escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private buildCategoryFilter(category?: string) {
    const trimmed = category?.trim();
    if (!trimmed) {
      return {};
    }

    return { category: new RegExp(`^${this.escapeRegExp(trimmed)}$`, 'i') };
  }

  private normalizeCategoryName(value: string) {
    return value.trim().toLocaleLowerCase();
  }

  private sanitizeCategoryName(value?: string) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private async ensureManagerCategory(managerUserId: string, category?: string) {
    const sanitized = this.sanitizeCategoryName(category);
    if (!sanitized) return;

    await this.managerCategoryModel
      .updateOne(
        {
          managerUserId: new Types.ObjectId(managerUserId),
          normalizedName: this.normalizeCategoryName(sanitized)
        },
        {
          $setOnInsert: {
            managerUserId: new Types.ObjectId(managerUserId),
            name: sanitized,
            normalizedName: this.normalizeCategoryName(sanitized)
          }
        },
        { upsert: true }
      )
      .exec();
  }

  private async listManagerProductIds(ownerUserId: string) {
    const pharmacy = await this.pharmaciesService.findByOwner(ownerUserId);
    const productIds = await this.inventoryModel
      .distinct('productId', { pharmacyId: pharmacy._id })
      .exec();

    return {
      pharmacy,
      productIds: productIds
        .map((value) => {
          if (value instanceof Types.ObjectId) return value;
          if (!Types.ObjectId.isValid(value)) return null;
          return new Types.ObjectId(value);
        })
        .filter((value): value is Types.ObjectId => value instanceof Types.ObjectId)
    };
  }

  private async bootstrapManagerCategories(ownerUserId: string) {
    const { productIds } = await this.listManagerProductIds(ownerUserId);
    if (productIds.length === 0) return;

    const categories = await this.productModel
      .find(
        {
          _id: { $in: productIds },
          category: { $exists: true, $ne: null }
        },
        { category: 1 }
      )
      .lean()
      .exec();

    const uniqueNames = Array.from(
      new Set(
        categories
          .map((entry) => this.sanitizeCategoryName(entry.category))
          .filter((entry): entry is string => Boolean(entry))
      )
    );

    if (uniqueNames.length === 0) return;

    const managerObjectId = new Types.ObjectId(ownerUserId);
    await this.managerCategoryModel.bulkWrite(
      uniqueNames.map((name) => ({
        updateOne: {
          filter: {
            managerUserId: managerObjectId,
            normalizedName: this.normalizeCategoryName(name)
          },
          update: {
            $setOnInsert: {
              managerUserId: managerObjectId,
              name,
              normalizedName: this.normalizeCategoryName(name)
            }
          },
          upsert: true
        }
      }))
    );
  }

  private buildFuzzyRegex(query: string) {
    const tokens = query
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 5);

    const pattern = tokens
      .map((token) =>
        Array.from(token)
          .map((char) => this.escapeRegExp(char))
          .join('.*')
      )
      .join('.*');

    return new RegExp(pattern || this.escapeRegExp(query.trim()), 'i');
  }

  private productContainsAllQueryTokens(
    product: Pick<Product, 'name' | 'scientificName' | 'barcode'>,
    query: string
  ) {
    const tokens = query
      .trim()
      .toLocaleLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    if (tokens.length <= 1) {
      return true;
    }

    const haystack = [product.name, product.scientificName, product.barcode]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase();

    return tokens.every((token) => haystack.includes(token));
  }

  private async logMovement(input: {
    inventoryItemId: string;
    pharmacyId: string;
    productId: string;
    type: StockMovementType;
    quantityDelta?: number;
    previousPrice?: number;
    nextPrice?: number;
    description?: string;
    actorUserId?: string;
  }) {
    await this.movementModel.create({
      inventoryItemId: new Types.ObjectId(input.inventoryItemId),
      pharmacyId: new Types.ObjectId(input.pharmacyId),
      productId: new Types.ObjectId(input.productId),
      type: input.type,
      quantityDelta: input.quantityDelta ?? 0,
      previousPrice: input.previousPrice,
      nextPrice: input.nextPrice,
      description: input.description,
      actorUserId: input.actorUserId
        ? new Types.ObjectId(input.actorUserId)
        : undefined,
      date: new Date()
    });
  }

  private async notifyProductAvailableWatchers(input: {
    productId: string;
    pharmacyId: string;
    pharmacyName: string;
    productName: string;
  }) {
    const watcherIds = await this.favoritesService.findUsersWatchingProduct(input.productId);

    await Promise.all(
      watcherIds.map((userId) =>
        this.notificationsService.notifyUser(
          userId,
          NotificationType.PRODUIT_DISPONIBLE,
          {
            titleKey: 'notification.productAvailable.title',
            messageKey: 'notification.productAvailable.message',
            params: {
              productName: input.productName,
              pharmacyName: input.pharmacyName
            }
          },
          {
            productId: input.productId,
            pharmacyId: input.pharmacyId
          }
        )
      )
    );
  }

  async listManagerProducts(ownerUserId: string) {
    const pharmacy = await this.pharmaciesService.findByOwner(ownerUserId);

    const items = await this.inventoryModel
      .find({ pharmacyId: pharmacy._id })
      .populate('productId')
      .sort({ updatedAt: -1 })
      .exec();

    return items.map((item) => ({
      inventoryId: item._id,
      product: item.productId,
      price: item.price,
      stockQuantity: item.stockQuantity,
      alertThreshold: item.alertThreshold,
      isAvailable: item.isAvailable,
      expiryDate: item.expiryDate,
      lastUpdatedAt: item.lastUpdatedAt
    }));
  }

  async createManagerProduct(ownerUserId: string, dto: CreateProductDto) {
    const pharmacy = await this.pharmaciesService.findByOwner(ownerUserId);
    const category = this.sanitizeCategoryName(dto.category);

    let product = dto.barcode
      ? await this.productModel.findOne({ barcode: dto.barcode }).exec()
      : null;

    if (!product) {
      product = await this.productModel.create({
        name: dto.name,
        scientificName: dto.scientificName,
        form: dto.form,
        strength: dto.strength,
        laboratory: dto.laboratory,
        atcCode: dto.atcCode,
        country: dto.country,
        source: dto.source ?? 'Catalogue pharmacies',
        barcode: dto.barcode,
        description: dto.description,
        noticeUrl: dto.noticeUrl,
        isMedicine: dto.isMedicine ?? true,
        category
      });
    } else {
      if (category) {
        product.category = category;
      }
      if (dto.scientificName !== undefined) {
        product.scientificName = dto.scientificName;
      }
      if (dto.form !== undefined) {
        product.form = dto.form;
      }
      if (dto.strength !== undefined) {
        product.strength = dto.strength;
      }
      if (dto.laboratory !== undefined) {
        product.laboratory = dto.laboratory;
      }
      if (dto.atcCode !== undefined) {
        product.atcCode = dto.atcCode;
      }
      if (dto.country !== undefined) {
        product.country = dto.country;
      }
      if (dto.source !== undefined) {
        product.source = dto.source;
      }
      await product.save();
    }

    const previousInventory = await this.inventoryModel
      .findOne({
        pharmacyId: pharmacy._id,
        productId: product._id
      })
      .exec();

    const inventory = await this.inventoryModel.findOneAndUpdate(
      {
        pharmacyId: pharmacy._id,
        productId: product._id
      },
      {
        $set: {
          price: dto.price,
          stockQuantity: dto.stockQuantity,
          alertThreshold: dto.alertThreshold ?? 5,
          isAvailable: dto.stockQuantity > 0,
          expiryDate: dto.expiryDate,
          lastUpdatedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    await this.logMovement({
      inventoryItemId: inventory._id.toString(),
      pharmacyId: pharmacy._id.toString(),
      productId: product._id.toString(),
      type: StockMovementType.CREER,
      quantityDelta: dto.stockQuantity,
      nextPrice: dto.price,
      actorUserId: ownerUserId
    });

    if ((previousInventory?.stockQuantity ?? 0) <= 0 && inventory.stockQuantity > 0) {
      await this.notifyProductAvailableWatchers({
        productId: product._id.toString(),
        pharmacyId: pharmacy._id.toString(),
        pharmacyName: pharmacy.name,
        productName: product.name
      });
    }

    if (category) {
      await this.ensureManagerCategory(ownerUserId, category);
    }

    await this.syncAdminMedicamentFromProduct(product, pharmacy);

    return {
      inventory,
      product
    };
  }

  async updateManagerProduct(
    ownerUserId: string,
    inventoryId: string,
    dto: UpdateProductDto
  ) {
    const pharmacy = await this.pharmaciesService.findByOwner(ownerUserId);

    const inventory = await this.inventoryModel
      .findOne({ _id: inventoryId, pharmacyId: pharmacy._id })
      .exec();
    if (!inventory) {
      throw new NotFoundException('Inventory item not found');
    }

    const product = await this.productModel.findById(inventory.productId).exec();
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const nextCategory =
      dto.category !== undefined ? this.sanitizeCategoryName(dto.category) : undefined;
    const payload = {
      ...dto,
      ...(dto.category !== undefined ? { category: nextCategory } : {})
    };

    Object.assign(product, payload);
    await product.save();

    if (dto.category !== undefined && nextCategory) {
      await this.ensureManagerCategory(ownerUserId, nextCategory);
    }

    await this.logMovement({
      inventoryItemId: inventory._id.toString(),
      pharmacyId: pharmacy._id.toString(),
      productId: product._id.toString(),
      type: StockMovementType.MODIFIER,
      actorUserId: ownerUserId,
      description: 'Product metadata updated'
    });

    await this.syncAdminMedicamentFromProduct(product, pharmacy);

    return { inventory, product };
  }

  async deleteManagerProduct(ownerUserId: string, inventoryId: string) {
    const pharmacy = await this.pharmaciesService.findByOwner(ownerUserId);

    const inventory = await this.inventoryModel
      .findOneAndDelete({ _id: inventoryId, pharmacyId: pharmacy._id })
      .exec();

    if (!inventory) {
      throw new NotFoundException('Inventory item not found');
    }

    await this.logMovement({
      inventoryItemId: inventory._id.toString(),
      pharmacyId: pharmacy._id.toString(),
      productId: inventory.productId.toString(),
      type: StockMovementType.SUPPRIMER,
      actorUserId: ownerUserId,
      description: 'Inventory item deleted'
    });

    return { success: true };
  }

  async updateManagerStock(
    ownerUserId: string,
    inventoryId: string,
    dto: UpdateStockDto
  ) {
    const pharmacy = await this.pharmaciesService.findByOwner(ownerUserId);

    const item = await this.inventoryModel
      .findOne({ _id: inventoryId, pharmacyId: pharmacy._id })
      .exec();

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    const previousQuantity = item.stockQuantity;
    const product = await this.productModel.findById(item.productId).exec();
    item.stockQuantity = dto.stockQuantity;
    if (dto.alertThreshold !== undefined) {
      item.alertThreshold = dto.alertThreshold;
    }
    item.isAvailable = item.stockQuantity > 0;
    item.lastUpdatedAt = new Date();
    await item.save();

    await this.logMovement({
      inventoryItemId: item._id.toString(),
      pharmacyId: pharmacy._id.toString(),
      productId: item.productId.toString(),
      type: StockMovementType.AJUSTEMENT,
      quantityDelta: item.stockQuantity - previousQuantity,
      actorUserId: ownerUserId,
      description: dto.description
    });

    if (item.stockQuantity <= item.alertThreshold) {
      await this.notificationsService.notifyUser(
        ownerUserId,
        NotificationType.STOCK_BAS,
        {
          titleKey: 'notification.lowStock.title',
          messageKey: 'notification.lowStock.message',
          params: {
            productName: product?.name ?? item.productId.toString(),
            stockQuantity: item.stockQuantity
          }
        }
      );
    }

    if (previousQuantity <= 0 && item.stockQuantity > 0 && product) {
      await this.notifyProductAvailableWatchers({
        productId: item.productId.toString(),
        pharmacyId: pharmacy._id.toString(),
        pharmacyName: pharmacy.name,
        productName: product.name
      });
    }

    return item;
  }

  async updateManagerPrice(
    ownerUserId: string,
    inventoryId: string,
    dto: UpdatePriceDto
  ) {
    const pharmacy = await this.pharmaciesService.findByOwner(ownerUserId);

    const item = await this.inventoryModel
      .findOne({ _id: inventoryId, pharmacyId: pharmacy._id })
      .exec();

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    const previousPrice = item.price;
    item.price = dto.price;
    item.lastUpdatedAt = new Date();
    await item.save();

    await this.logMovement({
      inventoryItemId: item._id.toString(),
      pharmacyId: pharmacy._id.toString(),
      productId: item.productId.toString(),
      type: StockMovementType.MODIFIER,
      previousPrice,
      nextPrice: dto.price,
      actorUserId: ownerUserId,
      description: dto.description
    });

    return item;
  }

  async listManagerCategories(ownerUserId: string) {
    await this.bootstrapManagerCategories(ownerUserId);

    const { productIds } = await this.listManagerProductIds(ownerUserId);
    const products = productIds.length
      ? await this.productModel
          .find(
            {
              _id: { $in: productIds },
              category: { $exists: true, $ne: null }
            },
            { category: 1 }
          )
          .lean()
          .exec()
      : [];

    const countByNormalized = new Map<string, number>();
    for (const product of products) {
      const category = this.sanitizeCategoryName(product.category);
      if (!category) continue;
      const key = this.normalizeCategoryName(category);
      countByNormalized.set(key, (countByNormalized.get(key) ?? 0) + 1);
    }

    const categories = await this.managerCategoryModel
      .find({ managerUserId: new Types.ObjectId(ownerUserId) })
      .sort({ name: 1 })
      .exec();

    return categories.map((entry) => {
      const key = this.normalizeCategoryName(entry.name);
      return {
        _id: entry._id.toString(),
        name: entry.name,
        normalizedName: entry.normalizedName,
        productCount: countByNormalized.get(key) ?? 0,
        createdAt: (entry as { createdAt?: Date }).createdAt,
        updatedAt: (entry as { updatedAt?: Date }).updatedAt
      };
    });
  }

  async createManagerCategory(ownerUserId: string, name: string) {
    const sanitized = this.sanitizeCategoryName(name);
    if (!sanitized) {
      throw new BadRequestException('Category name is required');
    }

    const normalizedName = this.normalizeCategoryName(sanitized);
    const managerObjectId = new Types.ObjectId(ownerUserId);

    const existing = await this.managerCategoryModel
      .findOne({ managerUserId: managerObjectId, normalizedName })
      .exec();
    if (existing) {
      return {
        _id: existing._id.toString(),
        name: existing.name,
        normalizedName: existing.normalizedName,
        productCount: 0,
        createdAt: (existing as { createdAt?: Date }).createdAt,
        updatedAt: (existing as { updatedAt?: Date }).updatedAt
      };
    }

    const created = await this.managerCategoryModel.create({
      managerUserId: managerObjectId,
      name: sanitized,
      normalizedName
    });

    return {
      _id: created._id.toString(),
      name: created.name,
      normalizedName: created.normalizedName,
      productCount: 0,
      createdAt: (created as { createdAt?: Date }).createdAt,
      updatedAt: (created as { updatedAt?: Date }).updatedAt
    };
  }

  async updateManagerCategory(ownerUserId: string, categoryId: string, name: string) {
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new NotFoundException('Category not found');
    }
    const sanitized = this.sanitizeCategoryName(name);
    if (!sanitized) {
      throw new BadRequestException('Category name is required');
    }

    const category = await this.managerCategoryModel
      .findOne({
        _id: new Types.ObjectId(categoryId),
        managerUserId: new Types.ObjectId(ownerUserId)
      })
      .exec();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const normalizedName = this.normalizeCategoryName(sanitized);
    if (normalizedName !== category.normalizedName) {
      const duplicate = await this.managerCategoryModel
        .findOne({
          managerUserId: new Types.ObjectId(ownerUserId),
          normalizedName
        })
        .exec();
      if (duplicate) {
        throw new BadRequestException('Category name already exists');
      }
    }

    const previousName = category.name;
    category.name = sanitized;
    category.normalizedName = normalizedName;
    await category.save();

    const { productIds } = await this.listManagerProductIds(ownerUserId);
    if (productIds.length > 0) {
      await this.productModel
        .updateMany(
          {
            _id: { $in: productIds },
            category: new RegExp(`^${this.escapeRegExp(previousName)}$`, 'i')
          },
          { $set: { category: sanitized } }
        )
        .exec();
    }

    return {
      _id: category._id.toString(),
      name: category.name,
      normalizedName: category.normalizedName,
      productCount: 0,
      createdAt: (category as { createdAt?: Date }).createdAt,
      updatedAt: (category as { updatedAt?: Date }).updatedAt
    };
  }

  async deleteManagerCategory(ownerUserId: string, categoryId: string, replaceWith?: string) {
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new NotFoundException('Category not found');
    }
    const category = await this.managerCategoryModel
      .findOne({
        _id: new Types.ObjectId(categoryId),
        managerUserId: new Types.ObjectId(ownerUserId)
      })
      .exec();
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const replacementName = this.sanitizeCategoryName(replaceWith);
    if (replacementName) {
      await this.ensureManagerCategory(ownerUserId, replacementName);
    }

    const { productIds } = await this.listManagerProductIds(ownerUserId);
    if (productIds.length > 0) {
      const filter = {
        _id: { $in: productIds },
        category: new RegExp(`^${this.escapeRegExp(category.name)}$`, 'i')
      };

      if (replacementName) {
        await this.productModel
          .updateMany(filter, { $set: { category: replacementName } })
          .exec();
      } else {
        await this.productModel
          .updateMany(filter, { $unset: { category: '' } })
          .exec();
      }
    }

    await this.managerCategoryModel
      .deleteOne({ _id: category._id, managerUserId: category.managerUserId })
      .exec();

    return { success: true };
  }

  async listPharmacyPublicProducts(pharmacyId: string) {
    return this.inventoryModel
      .find({ pharmacyId: new Types.ObjectId(pharmacyId), isAvailable: true })
      .populate('productId')
      .sort({ price: 1 })
      .exec();
  }

  async searchProducts(
    query?: string,
    category?: string,
    options?: { fuzzy?: boolean }
  ) {
    const categoryFilter = this.buildCategoryFilter(category);
    if (!query) {
      return this.productModel
        .find(categoryFilter)
        .limit(20)
        .sort({ createdAt: -1 })
        .exec();
    }

    const textResults = await this.productModel
      .find(
        { $text: { $search: query }, ...categoryFilter },
        { score: { $meta: 'textScore' } }
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(50)
      .exec();

    if (textResults.length > 0 || options?.fuzzy === false) {
      return textResults;
    }

    if (query.trim().length < 3) {
      return textResults;
    }

    const fuzzyRegex = this.buildFuzzyRegex(query);
    const fuzzyQuery = {
      ...categoryFilter,
      $or: [
        { name: { $regex: fuzzyRegex } },
        { scientificName: { $regex: fuzzyRegex } },
        { barcode: { $regex: fuzzyRegex } }
      ]
    };

    return this.productModel.find(fuzzyQuery).limit(50).exec();
  }

  async autocompleteProducts(query: string, options?: { prefix?: boolean }) {
    const trimmed = query?.trim();
    if (!trimmed) {
      return [];
    }

    if (options?.prefix) {
      const prefix = new RegExp(`^${this.escapeRegExp(trimmed)}`, 'i');
      return this.productModel
        .find({ $or: [{ name: { $regex: prefix } }, { scientificName: { $regex: prefix } }] })
        .limit(10)
        .exec();
    }

    return this.searchProducts(trimmed, undefined, { fuzzy: true });
  }

  async listCategories(input?: { q?: string; limit?: number }) {
    const query = input?.q?.trim();
    const filter = query
      ? { category: new RegExp(this.escapeRegExp(query), 'i') }
      : {};

    const raw = await this.productModel.distinct('category', filter);
    const normalized = raw
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean);

    const unique = Array.from(new Set(normalized));
    unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    const limit = input?.limit ?? 50;
    return unique.slice(0, limit);
  }

  async searchAvailableProducts(input: {
    query: string;
    lat?: number;
    lng?: number;
    radiusKm?: number;
    maxPrice?: number;
    pharmacyIds?: string[];
    category?: string;
    fuzzy?: boolean;
  }) {
    let productMatches = await this.searchProducts(
      input.query,
      input.category,
      { fuzzy: input.fuzzy }
    );
    if (input.query?.trim()) {
      const strictMatches = productMatches.filter((product) =>
        this.productContainsAllQueryTokens(product, input.query)
      );
      if (strictMatches.length > 0) {
        productMatches = strictMatches;
      }
    }

    const productIds = productMatches.map((p) => p._id);
    if (productIds.length === 0) {
      return [];
    }

    if (input.pharmacyIds && input.pharmacyIds.length === 0) {
      return [];
    }

    const pharmacyObjectIds = input.pharmacyIds
      ?.filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    const inventory = await this.inventoryModel
      .find({
        productId: { $in: productIds },
        isAvailable: true,
        ...(input.maxPrice !== undefined && { price: { $lte: input.maxPrice } }),
        ...(pharmacyObjectIds && { pharmacyId: { $in: pharmacyObjectIds } })
      })
      .populate('productId')
      .populate('pharmacyId')
      .sort({ price: 1 })
      .exec();

    return inventory;
  }

  async listMovements(ownerUserId: string) {
    const pharmacy = await this.pharmaciesService.findByOwner(ownerUserId);
    return this.movementModel
      .find({ pharmacyId: pharmacy._id })
      .sort({ date: -1 })
      .limit(200)
      .exec();
  }
}
