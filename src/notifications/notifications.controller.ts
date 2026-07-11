import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SuccessResponseDto } from '../auth/dto/auth-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { UsersService } from '../users/users.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { PushTokensService } from './push-tokens.service';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { RemovePushTokenDto } from './dto/remove-push-token.dto';
import { PushTokenResponseDto } from './dto/push-token-response.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
    private readonly pushTokensService: PushTokensService
  ) {}

  @Get()
  @ApiOkResponse({ type: NotificationResponseDto, isArray: true })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.list(user.userId);
  }

  @Patch(':id/read')
  @ApiOkResponse({ type: SuccessResponseDto })
  markAsRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notificationsService.markAsRead(user.userId, id);
  }

  @Patch('settings')
  @ApiOkResponse({ type: UserResponseDto })
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNotificationSettingsDto
  ) {
    return this.usersService.updatePreferences(user.userId, dto);
  }

  @Get('push-tokens')
  @ApiOkResponse({ type: PushTokenResponseDto, isArray: true })
  async listPushTokens(@CurrentUser() user: AuthenticatedUser) {
    const tokens = await this.pushTokensService.list(user.userId);
    return tokens.map((item) => ({
      token: item.token,
      platform: item.platform,
      createdAt: ((item as { createdAt?: Date }).createdAt ?? new Date()).toISOString()
    }));
  }

  @Post('push-tokens')
  @ApiOkResponse({ type: SuccessResponseDto })
  registerPushToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterPushTokenDto
  ) {
    return this.pushTokensService.register(user.userId, dto.token, dto.platform);
  }

  @Delete('push-tokens')
  @ApiOkResponse({ type: SuccessResponseDto })
  removePushToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RemovePushTokenDto
  ) {
    return this.pushTokensService.remove(user.userId, dto.token);
  }
}
