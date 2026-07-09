import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateHistoryDto } from './dto/create-history.dto';
import { SearchHistory, SearchHistoryDocument } from './schemas/search-history.schema';

@Injectable()
export class HistoryService {
  constructor(
    @InjectModel(SearchHistory.name)
    private readonly historyModel: Model<SearchHistoryDocument>
  ) {}

  async list(userId: string) {
    return this.historyModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(200)
      .exec();
  }

  async create(userId: string, dto: CreateHistoryDto) {
    return this.historyModel.create({
      userId: new Types.ObjectId(userId),
      query: dto.query,
      searchType: dto.searchType,
      resultCount: dto.resultCount ?? 0,
      metadata: dto.metadata
    });
  }

  async deleteOne(userId: string, historyId: string) {
    await this.historyModel
      .deleteOne({ _id: historyId, userId: new Types.ObjectId(userId) })
      .exec();
    return { success: true };
  }

  async clear(userId: string) {
    await this.historyModel.deleteMany({ userId: new Types.ObjectId(userId) }).exec();
    return { success: true };
  }
}
