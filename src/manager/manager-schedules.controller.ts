import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SuccessResponseDto } from 'src/auth/dto/auth-response.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/domain.enums';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthenticatedUser } from 'src/common/types/authenticated-user.type';
import { ManagerScheduleResponseDto } from './dto/manager-response.dto';
import { CreateExceptionScheduleDto } from 'src/schedules/dto/create-exception-schedule.dto';
import { UpdateWeeklyScheduleDto } from 'src/schedules/dto/update-weekly-schedule.dto';
import { SchedulesService } from 'src/schedules/schedules.service';

@ApiTags('Manager')
@ApiBearerAuth('bearer')
@Roles(Role.PHARMACY_MANAGER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('manager/schedules')
export class ManagerSchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @ApiOkResponse({ type: ManagerScheduleResponseDto })
  getSchedule(@CurrentUser() user: AuthenticatedUser) {
    return this.schedulesService.getManagerSchedule(user.userId);
  }

  @Put('weekly')
  @ApiOkResponse({ type: ManagerScheduleResponseDto })
  updateWeekly(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateWeeklyScheduleDto
  ) {
    return this.schedulesService.updateWeekly(user.userId, dto);
  }

  @Post('exceptions')
  @ApiOkResponse({ type: ManagerScheduleResponseDto })
  addException(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExceptionScheduleDto
  ) {
    return this.schedulesService.addException(user.userId, dto);
  }

  @Delete('exceptions/:index')
  @ApiOkResponse({ type: SuccessResponseDto })
  removeException(
    @CurrentUser() user: AuthenticatedUser,
    @Param('index') index: string
  ) {
    return this.schedulesService.removeException(user.userId, Number(index));
  }
}
