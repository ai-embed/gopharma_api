import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/domain.enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { UpdateManagerPharmacyDto } from '../pharmacies/dto/update-manager-pharmacy.dto';
import { PharmaciesService } from '../pharmacies/pharmacies.service';
import { ManagerPharmacyResponseDto } from './dto/manager-response.dto';
import { UpdateManagerStatusDto } from './dto/update-manager-status.dto';

@ApiTags('Manager')
@ApiBearerAuth('bearer')
@Roles(Role.PHARMACY_MANAGER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('manager/pharmacy')
export class ManagerPharmacyController {
  constructor(private readonly pharmaciesService: PharmaciesService) {}

  @Get()
  @ApiOkResponse({ type: ManagerPharmacyResponseDto })
  getOwnPharmacy(@CurrentUser() user: AuthenticatedUser) {
    return this.pharmaciesService.findByOwner(user.userId);
  }

  @Patch()
  @ApiOkResponse({ type: ManagerPharmacyResponseDto })
  updateOwnPharmacy(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateManagerPharmacyDto
  ) {
    return this.pharmaciesService.updateManagerPharmacy(user.userId, dto);
  }

  @Patch('status')
  @ApiOkResponse({ type: ManagerPharmacyResponseDto })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateManagerStatusDto
  ) {
    return this.pharmaciesService.updateOperationalStatus(user.userId, dto.status);
  }

  @Post('photo')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Pharmacy photo (JPG, PNG, WebP, max 5MB)',
        },
      },
    },
  })
  @ApiOkResponse({ type: ManagerPharmacyResponseDto })
  @UseInterceptors(FileInterceptor('photo'))
  uploadPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024, message: 'File must be less than 5MB' }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      })
    )
    file: Express.Multer.File
  ) {
    return this.pharmaciesService.uploadPhoto(user.userId, file);
  }

  @Post('banner')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        banner: {
          type: 'string',
          format: 'binary',
          description: 'Pharmacy banner (JPG, PNG, WebP, max 10MB)',
        },
      },
    },
  })
  @ApiOkResponse({ type: ManagerPharmacyResponseDto })
  @UseInterceptors(FileInterceptor('banner'))
  uploadBanner(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024, message: 'File must be less than 10MB' }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      })
    )
    file: Express.Multer.File
  ) {
    return this.pharmaciesService.uploadBanner(user.userId, file);
  }

  @Delete('photo')
  @ApiOperation({ summary: 'Delete pharmacy photo' })
  @ApiOkResponse({ type: ManagerPharmacyResponseDto })
  async deletePhoto(@CurrentUser() user: AuthenticatedUser) {
    return this.pharmaciesService.deletePhoto(user.userId);
  }

  @Delete('banner')
  @ApiOperation({ summary: 'Delete pharmacy banner' })
  @ApiOkResponse({ type: ManagerPharmacyResponseDto })
  async deleteBanner(@CurrentUser() user: AuthenticatedUser) {
    return this.pharmaciesService.deleteBanner(user.userId);
  }
}
