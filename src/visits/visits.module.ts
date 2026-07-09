import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Visit, VisitSchema } from './schemas/visit.schema';
import { VisitsService } from './visits.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Visit.name, schema: VisitSchema }])],
  providers: [VisitsService],
  exports: [VisitsService, MongooseModule]
})
export class VisitsModule {}
