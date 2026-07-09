import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/domain.enums';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthenticatedUser } from 'src/common/types/authenticated-user.type';
import { PharmaciesService } from 'src/pharmacies/pharmacies.service';
import { VisitsService } from 'src/visits/visits.service';
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
