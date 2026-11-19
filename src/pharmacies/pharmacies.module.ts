import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CloudinaryModule } from '../common/services/cloudinary.module';
import { CatalogModule } from '../catalog/catalog.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { VisitsModule } from '../visits/visits.module';
import {
  PharmacyValidation,
  PharmacyValidationSchema
} from './schemas/pharmacy-validation.schema';
import { Pharmacy, PharmacySchema } from './schemas/pharmacy.schema';
import { PharmacyReport, PharmacyReportSchema } from './schemas/pharmacy-report.schema';
import { PharmaciesController } from './pharmacies.controller';
import { PharmaciesService } from './pharmacies.service';
import { PharmacyReportsService } from './pharmacy-reports.service';
import { PharmacyValidationsService } from './pharmacy-validations.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Pharmacy.name, schema: PharmacySchema },
      { name: PharmacyReport.name, schema: PharmacyReportSchema },
      { name: PharmacyValidation.name, schema: PharmacyValidationSchema }
    ]),
    CloudinaryModule,
    forwardRef(() => CatalogModule),
    forwardRef(() => SchedulesModule),
    VisitsModule
  ],
  controllers: [PharmaciesController],
  providers: [PharmaciesService, PharmacyValidationsService, PharmacyReportsService],
  exports: [
    PharmaciesService,
    PharmacyValidationsService,
    PharmacyReportsService,
    MongooseModule
  ]
})
export class PharmaciesModule {}
