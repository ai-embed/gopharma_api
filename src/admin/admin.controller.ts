import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { AuditLogQueryDto } from 'src/audit/dto/audit-log-query.dto';
import { AuditLogListResponseDto } from 'src/audit/dto/audit-log-response.dto';
import { UserResponseDto } from 'src/users/dto/user-response.dto';
import { MailerService } from 'src/common/services/mailer.service';
import { PublicDrugsQueryDto } from 'src/public-drugs/dto/public-drugs-query.dto';
import { PublicDrugResponseDto } from 'src/public-drugs/dto/public-drug-response.dto';
import {
  AdminGrowthOverviewResponseDto,
  AdminPharmacyResponseDto,
  AdminCreatePharmacyResponseDto,
  AdminCreateUserResponseDto,
  AdminProductsCleanupResponseDto,
  AdminMedicamentsListResponseDto,
  AdminMedicamentsSyncResponseDto,
  AdminReportsOverviewResponseDto,
  AdminValidationApprovalResponseDto,
  AdminValidationRejectionResponseDto,
  IntegrationStatusMapResponseDto,
  PharmacyValidationResponseDto
} from './dto/admin-response.dto';
import { CreateAdminPharmacyDto } from './dto/create-admin-pharmacy.dto';
import { CreateAdminMedicamentDto } from './dto/create-admin-medicament.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { SendTestEmailDto } from './dto/send-test-email.dto';
import { ReviewValidationDto } from './dto/review-validation.dto';
import { SuspendAccountDto } from './dto/suspend-account.dto';
import { UpdateAdminPharmacyDto } from './dto/update-admin-pharmacy.dto';
import { UpdateAdminMedicamentDto } from './dto/update-admin-medicament.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth('bearer')
@Roles(Role.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly mailerService: MailerService
  ) {}

  @Get('validations')
  @ApiOkResponse({ type: PharmacyValidationResponseDto, isArray: true })
  listValidations() {
    return this.adminService.listValidations();
  }

  @Post('validations/:id/approve')
  @ApiOkResponse({ type: AdminValidationApprovalResponseDto })
  approve(
    @Param('id') validationId: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: ReviewValidationDto
  ) {
    return this.adminService.approveValidation(validationId, admin.userId, dto.comment);
  }

  @Post('validations/:id/reject')
  @ApiOkResponse({ type: AdminValidationRejectionResponseDto })
  reject(
    @Param('id') validationId: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: ReviewValidationDto
  ) {
    return this.adminService.rejectValidation(validationId, admin.userId, dto.comment);
  }

  @Post('accounts/:id/suspend')
  @ApiOkResponse({ type: SuccessResponseDto })
  suspend(
    @Param('id') userId: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: SuspendAccountDto
  ) {
    return this.adminService.suspendAccount(userId, admin.userId, dto);
  }

  @Post('accounts/:id/unsuspend')
  @ApiOkResponse({ type: SuccessResponseDto })
  unsuspend(@Param('id') userId: string) {
    return this.adminService.unsuspendAccount(userId);
  }

  @Get('users')
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  listUsers() {
    return this.adminService.listUsers();
  }

  @Get('users/:id')
  @ApiOkResponse({ type: UserResponseDto })
  getUser(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Post('users')
  @ApiOkResponse({ type: AdminCreateUserResponseDto })
  createUser(@Body() dto: CreateAdminUserDto) {
    return this.adminService.createUser(dto);
  }

  @Patch('users/:id')
  @ApiOkResponse({ type: UserResponseDto })
  updateUser(@Param('id') id: string, @Body() dto: UpdateAdminUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Delete('users/:id')
  @ApiOkResponse({ type: SuccessResponseDto })
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('pharmacies')
  @ApiOkResponse({ type: AdminPharmacyResponseDto, isArray: true })
  listPharmacies() {
    return this.adminService.listPharmacies();
  }

  @Get('pharmacies/:id')
  @ApiOkResponse({ type: AdminPharmacyResponseDto })
  getPharmacy(@Param('id') id: string) {
    return this.adminService.getPharmacyById(id);
  }

  @Post('pharmacies')
  @ApiOkResponse({ type: AdminCreatePharmacyResponseDto })
  createPharmacy(@Body() dto: CreateAdminPharmacyDto) {
    return this.adminService.createPharmacy(dto);
  }

  @Patch('pharmacies/:id')
  @ApiOkResponse({ type: AdminPharmacyResponseDto })
  updatePharmacy(@Param('id') id: string, @Body() dto: UpdateAdminPharmacyDto) {
    return this.adminService.updatePharmacy(id, dto);
  }

  @Delete('pharmacies/:id')
  @ApiOkResponse({ type: SuccessResponseDto })
  deletePharmacy(@Param('id') id: string) {
    return this.adminService.deletePharmacy(id);
  }

  @Get('audit-logs')
  @ApiOkResponse({ type: AuditLogListResponseDto })
  listAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.adminService.listAuditLogs(query);
  }

  @Get('medicaments')
  @ApiOkResponse({ type: AdminMedicamentsListResponseDto })
  listMedicaments(
    @Query() query: PublicDrugsQueryDto
  ): Promise<AdminMedicamentsListResponseDto> {
    return this.adminService.listMedicaments({
      q: query.q,
      limit: query.limit,
      offset: query.offset,
      form: query.form,
      sort: query.sort
    });
  }

  @Post('medicaments')
  @ApiOkResponse({ type: PublicDrugResponseDto })
  createMedicament(@Body() dto: CreateAdminMedicamentDto) {
    return this.adminService.createMedicament(dto);
  }

  @Get('medicaments/:id')
  @ApiOkResponse({ type: PublicDrugResponseDto })
  getMedicamentById(@Param('id') id: string) {
    return this.adminService.getMedicamentById(id);
  }

  @Patch('medicaments/:id')
  @ApiOkResponse({ type: PublicDrugResponseDto })
  updateMedicament(
    @Param('id') id: string,
    @Body() dto: UpdateAdminMedicamentDto
  ) {
    return this.adminService.updateMedicament(id, dto);
  }

  @Delete('medicaments/:id')
  @ApiOkResponse({ type: SuccessResponseDto })
  deleteMedicament(@Param('id') id: string) {
    return this.adminService.deleteMedicament(id);
  }

  @Post('medicaments/sync-from-products')
  @ApiOkResponse({ type: AdminMedicamentsSyncResponseDto })
  syncMedicamentsFromProducts() {
    return this.adminService.syncMedicamentsFromProducts();
  }

  @Post('medicaments/cleanup-orphans')
  @ApiOkResponse({ type: AdminProductsCleanupResponseDto })
  cleanupOrphanProducts() {
    return this.adminService.cleanupOrphanProducts();
  }

  @Get('reports/overview')
  @ApiOkResponse({ type: AdminReportsOverviewResponseDto })
  reportsOverview() {
    return this.adminService.getReportsOverview();
  }

  @Get('growth')
  @ApiOkResponse({ type: AdminGrowthOverviewResponseDto })
  growthOverview() {
    return this.adminService.getGrowthOverview();
  }

  @Get('integrations/status')
  @ApiOkResponse({ type: IntegrationStatusMapResponseDto })
  integrationsStatus() {
    return this.adminService.getIntegrationsStatus();
  }

  @Post('integrations/validate')
  @ApiOkResponse({ type: IntegrationStatusMapResponseDto })
  validateIntegrations() {
    return this.adminService.validateIntegrations();
  }

  @Post('integrations/smtp/test-email')
  @ApiOkResponse({ type: SuccessResponseDto })
  async sendSmtpTestEmail(@Body() dto: SendTestEmailDto) {
    await this.mailerService.sendMail(
      dto.to,
      'GoPharma SMTP Test',
      'SMTP configuration validated successfully.'
    );
    return { success: true };
  }
}
