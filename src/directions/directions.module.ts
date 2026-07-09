import { Module } from '@nestjs/common';
import { GeocodingService } from 'src/common/services/geocoding.service';
import { DirectionsController } from './directions.controller';
import { DirectionsService } from './directions.service';

@Module({
  controllers: [DirectionsController],
  providers: [DirectionsService, GeocodingService]
})
export class DirectionsModule {}
