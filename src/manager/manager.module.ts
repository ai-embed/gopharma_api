import { Module, forwardRef } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { PharmaciesModule } from '../pharmacies/pharmacies.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { VisitsModule } from '../visits/visits.module';
import { ManagerPharmacyController } from './manager-pharmacy.controller';
import { ManagerProductsController } from './manager-products.controller';
import { ManagerSchedulesController } from './manager-schedules.controller';
import { ManagerStatsController } from './manager-stats.controller';

@Module({
  imports: [
    forwardRef(() => PharmaciesModule),
    forwardRef(() => CatalogModule),
    SchedulesModule,
    VisitsModule
  ],
  controllers: [
    ManagerPharmacyController,
    ManagerProductsController,
    ManagerSchedulesController,
    ManagerStatsController
  ]
})
export class ManagerModule {}
