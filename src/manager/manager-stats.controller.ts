import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/domain.enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { PharmaciesService } from '../pharmacies/pharmacies.service';
import { VisitsService } from '../visits/visits.service';
import { VisitStatsResponseDto } from './dto/manager-response.dto';

@ApiTags('Manager')
@ApiBearerAuth('bearer')
@Roles(Role.PHARMACY_MANAGER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('manager/stats')
export class ManagerStatsController {
  constructor(
    private readonly pharmaciesService: PharmaciesService,
    private readonly visitsService: VisitsService
  ) {}

  @Get('visits')
  @ApiOkResponse({ type: VisitStatsResponseDto })
  async getVisitStats(@CurrentUser() user: AuthenticatedUser) {
    const pharmacy = await this.pharmaciesService.findByOwner(user.userId);
    return this.visitsService.getPharmacyVisitStats(pharmacy._id.toString());
  }
}
