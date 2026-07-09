import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PharmaciesModule } from 'src/pharmacies/pharmacies.module';
import { Schedule, ScheduleSchema } from './schemas/schedule.schema';
import { SchedulesService } from './schedules.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Schedule.name, schema: ScheduleSchema }]),
    forwardRef(() => PharmaciesModule)
  ],
  providers: [SchedulesService],
  exports: [SchedulesService]
})
export class SchedulesModule {}
