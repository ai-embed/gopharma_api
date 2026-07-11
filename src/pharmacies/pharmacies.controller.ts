import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CatalogService } from '../catalog/catalog.service';
import { Public } from '../common/decorators/public.decorator';
import { VisitsService } from '../visits/visits.service';
import { PublicPharmacyResponseDto } from './dto/public-pharmacy-response.dto';
import { PharmacyQueryDto } from './dto/pharmacy-query.dto';
import { PharmaciesService } from './pharmacies.service';
import { SchedulesService } from '../schedules/schedules.service';

@ApiTags('Pharmacies')
@Controller('pharmacies')
export class PharmaciesController {
  constructor(
    private readonly pharmaciesService: PharmaciesService,
    private readonly catalogService: CatalogService,
    private readonly visitsService: VisitsService,
    private readonly schedulesService: SchedulesService
  ) {}

  @Public()
  @Get()
  @ApiOkResponse({ type: PublicPharmacyResponseDto, isArray: true })
  list(@Query() query: PharmacyQueryDto) {
    return this.pharmaciesService.listPublic(query);
  }

  @Public()
  @Get(':id')
  @ApiOkResponse({ type: PublicPharmacyResponseDto })
  async getById(@Param('id') id: string) {
    const pharmacy = await this.pharmaciesService.getPublicById(id);
    await this.visitsService.logPharmacyVisit(id);
    return pharmacy;
  }

  @Public()
  @Get(':id/products')
  getProducts(@Param('id') id: string) {
    return this.catalogService.listPharmacyPublicProducts(id);
  }

  @Public()
  @Get(':id/schedule')
  getSchedule(@Param('id') id: string) {
    return this.schedulesService.getByPharmacyId(id);
  }
}
