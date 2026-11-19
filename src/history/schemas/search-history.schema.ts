import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SearchType } from '../../common/enums/domain.enums';

export type SearchHistoryDocument = HydratedDocument<SearchHistory>;

@Schema({ timestamps: true, collection: 'search_history' })
export class SearchHistory {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  query!: string;

  @Prop({ required: true, enum: SearchType })
  searchType!: SearchType;

  @Prop({ required: true, default: 0 })
  resultCount!: number;

  @Prop({ type: Object, required: false })
  metadata?: Record<string, unknown>;
}

export const SearchHistorySchema = SchemaFactory.createForClass(SearchHistory);
SearchHistorySchema.index({ userId: 1, createdAt: -1 });
