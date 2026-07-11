import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FavoriteTargetType } from '../common/enums/domain.enums';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { Favorite, FavoriteDocument } from './schemas/favorite.schema';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectModel(Favorite.name)
    private readonly favoriteModel: Model<FavoriteDocument>
  ) {}

  async list(userId: string) {
    return this.favoriteModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async create(userId: string, dto: CreateFavoriteDto) {
    if (
      dto.targetType === FavoriteTargetType.PHARMACY &&
      (!dto.pharmacyId || dto.productId)
    ) {
      throw new BadRequestException('For PHARMACY favorite, provide only pharmacyId');
    }

    if (
      dto.targetType === FavoriteTargetType.PRODUCT &&
      (!dto.productId || dto.pharmacyId)
    ) {
      throw new BadRequestException('For PRODUCT favorite, provide only productId');
    }

    return this.favoriteModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        targetType: dto.targetType,
        pharmacyId: dto.pharmacyId ? new Types.ObjectId(dto.pharmacyId) : undefined,
        productId: dto.productId ? new Types.ObjectId(dto.productId) : undefined
      },
      {
        $setOnInsert: {
          userId: new Types.ObjectId(userId),
          targetType: dto.targetType,
          pharmacyId: dto.pharmacyId
            ? new Types.ObjectId(dto.pharmacyId)
            : undefined,
          productId: dto.productId ? new Types.ObjectId(dto.productId) : undefined
        }
      },
      { upsert: true, new: true }
    );
  }

  async delete(userId: string, favoriteId: string) {
    await this.favoriteModel
      .deleteOne({ _id: favoriteId, userId: new Types.ObjectId(userId) })
      .exec();

    return { success: true };
  }

  async findUsersWatchingProduct(productId: string) {
    const favorites = await this.favoriteModel
      .find({
        targetType: FavoriteTargetType.PRODUCT,
        productId: new Types.ObjectId(productId)
      })
      .exec();

    return [...new Set(favorites.map((favorite) => favorite.userId.toString()))];
  }
}
