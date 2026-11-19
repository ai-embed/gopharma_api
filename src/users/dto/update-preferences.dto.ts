import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import {
  NotificationChannel,
  SupportedLanguage,
  ThemePreference
} from '../../common/enums/domain.enums';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ enum: SupportedLanguage, enumName: 'SupportedLanguage' })
  @IsOptional()
  @IsEnum(SupportedLanguage)
  language?: SupportedLanguage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ enum: NotificationChannel, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  alertsEnabled?: boolean;

  @ApiPropertyOptional({ enum: ThemePreference, enumName: 'ThemePreference' })
  @IsOptional()
  @IsEnum(ThemePreference)
  theme?: ThemePreference;
}
