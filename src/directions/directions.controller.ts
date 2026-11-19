import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { DirectionsQueryDto } from './dto/directions-query.dto';
import { DirectionsResponseDto } from './dto/directions-response.dto';
import { DirectionsService } from './directions.service';

@ApiTags('Directions')
@Controller('directions')
export class DirectionsController {
  constructor(private readonly directionsService: DirectionsService) {}

  @Public()
  @Get()
  @ApiOkResponse({ type: DirectionsResponseDto })
  getDirections(@Query() query: DirectionsQueryDto): Promise<DirectionsResponseDto> {
    return this.directionsService.getDirections(query);
  }
}
