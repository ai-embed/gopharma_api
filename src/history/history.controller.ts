import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuditLogListResponseDto } from '../audit/dto/audit-log-response.dto';
import { AuditService } from '../audit/audit.service';
import { SuccessResponseDto } from '../auth/dto/auth-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { HistoryActivityQueryDto } from './dto/history-activity-query.dto';
import { CreateHistoryDto } from './dto/create-history.dto';
import { HistoryResponseDto } from './dto/history-response.dto';
import { HistoryService } from './history.service';

@ApiTags('History')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('history')
export class HistoryController {
  constructor(
    private readonly historyService: HistoryService,
    private readonly auditService: AuditService
  ) {}

  @Get()
  @ApiOkResponse({ type: HistoryResponseDto, isArray: true })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.historyService.list(user.userId);
  }

  @Get('activity')
  @ApiOkResponse({ type: AuditLogListResponseDto })
  listActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: HistoryActivityQueryDto
  ) {
    return this.auditService.listUserActivity(user.userId, query);
  }

  @Post()
  @ApiCreatedResponse({ type: HistoryResponseDto })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateHistoryDto) {
    return this.historyService.create(user.userId, dto);
  }

  @Delete(':id')
  @ApiOkResponse({ type: SuccessResponseDto })
  deleteOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.historyService.deleteOne(user.userId, id);
  }

  @Delete()
  @ApiOkResponse({ type: SuccessResponseDto })
  clear(@CurrentUser() user: AuthenticatedUser) {
    return this.historyService.clear(user.userId);
  }
}
