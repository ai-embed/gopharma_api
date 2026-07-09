import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from 'src/audit/audit.module';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { SearchHistory, SearchHistorySchema } from './schemas/search-history.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SearchHistory.name, schema: SearchHistorySchema }
    ]),
    AuditModule
  ],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService]
})
export class HistoryModule {}
