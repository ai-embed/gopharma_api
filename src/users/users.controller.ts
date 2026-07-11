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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';
import { SuccessResponseDto } from '../auth/dto/auth-response.dto';

@ApiTags('Users')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMe(user.userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the authenticated user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMeDto
  ) {
    return this.usersService.updateMe(user.userId, dto);
  }

  @Patch('me/preferences')
  @ApiOperation({ summary: 'Update language, notification and theme preferences' })
  @ApiOkResponse({ type: UserResponseDto })
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePreferencesDto
  ) {
    return this.usersService.updatePreferences(user.userId, dto);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Soft delete the authenticated user account' })
  @ApiOkResponse({ type: SuccessResponseDto })
  async deleteMe(@CurrentUser() user: AuthenticatedUser) {
    await this.usersService.deleteMe(user.userId);
    return { success: true };
  }

  @Post('me/photo')
  @ApiOperation({ summary: 'Upload profile photo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Profile photo (JPG, PNG, WebP, max 5MB)',
        },
      },
    },
  })
  @ApiOkResponse({ type: UserResponseDto })
  @UseInterceptors(FileInterceptor('photo'))
  async uploadProfilePhoto(
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
    return this.usersService.uploadProfilePhoto(user.userId, file);
  }

  @Delete('me/photo')
  @ApiOperation({ summary: 'Delete profile photo' })
  @ApiOkResponse({ type: UserResponseDto })
  async deleteProfilePhoto(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.deleteProfilePhoto(user.userId);
  }
}
