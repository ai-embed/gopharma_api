import { Module, forwardRef } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { GeocodingService } from '../common/services/geocoding.service';
import { PharmaciesModule } from '../pharmacies/pharmacies.module';
import { SchedulesModule } from '../schedules/schedules.module';
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
