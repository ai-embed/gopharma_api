import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CatalogService } from '../catalog/catalog.service';
import { Public } from '../common/decorators/public.decorator';
import { VisitsService } from '../visits/visits.service';
import { PublicPharmacyResponseDto } from './dto/public-pharmacy-response.dto';
import { PharmacyQueryDto } from './dto/pharmacy-query.dto';
import { PharmaciesService } from './pharmacies.service';
import { SchedulesService } from '../schedules/schedules.service';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { CreatePharmacyReportDto } from './dto/create-pharmacy-report.dto';
import { PharmacyReportsService } from './pharmacy-reports.service';

@ApiTags('Pharmacies')
@Controller('pharmacies')
export class PharmaciesController {
  constructor(
    private readonly pharmaciesService: PharmaciesService,
    private readonly catalogService: CatalogService,
    private readonly visitsService: VisitsService,
    private readonly schedulesService: SchedulesService,
    private readonly pharmacyReportsService: PharmacyReportsService
  ) {}

  @Public()
  @Get()
  @ApiOkResponse({ type: PublicPharmacyResponseDto, isArray: true })
  async list(@Query() query: PharmacyQueryDto) {
    const [registered, community] = await Promise.all([
      this.pharmaciesService.listPublic(query),
      this.pharmacyReportsService.listPublished(query)
    ]);
    const results = [
      ...registered,
      ...community.map((report) => this.pharmacyReportsService.asPublicPharmacy(report))
    ];

    if (query.lat === undefined || query.lng === undefined) return results;
    const distanceSquared = (item: (typeof results)[number]) => {
      const coordinates = item.location?.coordinates;
      if (!coordinates) return Number.POSITIVE_INFINITY;
      const [lng, lat] = coordinates;
      return (lat - query.lat!) ** 2 + (lng - query.lng!) ** 2;
    };
    return results.sort((left, right) => distanceSquared(left) - distanceSquared(right));
  }

  @Public()
  @Post('reports')
  @RateLimit({ limit: 5, ttlMs: 60_000 })
  submitReport(@Body() dto: CreatePharmacyReportDto) {
    return this.pharmacyReportsService.create(dto);
  }

  @Public()
  @Get(':id')
  @ApiOkResponse({ type: PublicPharmacyResponseDto })
  async getById(@Param('id') id: string) {
    const communityReport = await this.pharmacyReportsService.findPublishedById(id);
    if (communityReport) {
      return this.pharmacyReportsService.asPublicPharmacy(communityReport);
    }
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
