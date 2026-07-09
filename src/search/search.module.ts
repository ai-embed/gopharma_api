import { Module, forwardRef } from '@nestjs/common';
import { CatalogModule } from 'src/catalog/catalog.module';
import { GeocodingService } from 'src/common/services/geocoding.service';
import { PharmaciesModule } from 'src/pharmacies/pharmacies.module';
import { SchedulesModule } from 'src/schedules/schedules.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [
    forwardRef(() => CatalogModule),
    forwardRef(() => PharmaciesModule),
    SchedulesModule
  ],
  controllers: [SearchController],
  providers: [SearchService, GeocodingService]
})
export class SearchModule {}
