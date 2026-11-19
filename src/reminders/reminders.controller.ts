import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SuccessResponseDto } from '../auth/dto/auth-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/domain.enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { ReminderResponseDto } from './dto/reminder-response.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { RemindersService } from './reminders.service';

@ApiTags('Reminders')
@ApiBearerAuth('bearer')
@Roles(Role.PATIENT)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get()
  @ApiOkResponse({ type: ReminderResponseDto, isArray: true })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.remindersService.list(user.userId);
  }

  @Post()
  @ApiCreatedResponse({ type: ReminderResponseDto })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReminderDto) {
    return this.remindersService.create(user.userId, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ReminderResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateReminderDto
  ) {
    return this.remindersService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({ type: SuccessResponseDto })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.remindersService.remove(user.userId, id);
  }
}
