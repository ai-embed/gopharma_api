import {
  Body,
  Controller,
  Get,
  HttpCode,
  Req,
  Res,
  Post,
  UseGuards
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import {
  AuthSessionResponseDto,
  ForgotPasswordResponseDto,
  RegisterPatientResponseDto,
  RegisterPharmacyResponseDto,
  SuccessResponseDto,
  TokenPairResponseDto
} from './dto/auth-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { RegisterPharmacyDto } from './dto/register-pharmacy.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { GoogleOAuthIdentity } from './google-oauth.types';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register-patient')
  @ApiOperation({ summary: 'Register a patient account' })
  @ApiCreatedResponse({ type: RegisterPatientResponseDto })
  registerPatient(@Body() dto: RegisterPatientDto) {
    return this.authService.registerPatient(dto);
  }

  @Public()
  @Post('register-pharmacy')
  @ApiOperation({ summary: 'Register a pharmacy manager and pending pharmacy account' })
  @ApiCreatedResponse({ type: RegisterPharmacyResponseDto })
  registerPharmacy(@Body() dto: RegisterPharmacyDto) {
    return this.authService.registerPharmacy(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiOkResponse({ type: AuthSessionResponseDto })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify an email using a code' })
  @ApiOkResponse({ type: SuccessResponseDto })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Public()
  @Post('verify-email/resend')
  @HttpCode(200)
  @ApiOperation({ summary: 'Resend an email verification code' })
  @ApiOkResponse({ type: SuccessResponseDto })
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Public()
  @Post('google')
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate with a Google ID token verified server-side' })
  @ApiOkResponse({ type: AuthSessionResponseDto })
  google(@Body() dto: GoogleAuthDto) {
    return this.authService.googleAuth(dto);
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Start the Google OAuth redirect flow' })
  @ApiExcludeEndpoint()
  googleRedirect() {
    return undefined;
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Handle the Google OAuth callback and issue GoPharma tokens' })
  @ApiExcludeEndpoint()
  async googleCallback(
    @Req() request: Request & { user: GoogleOAuthIdentity },
    @Res() response: Response
  ) {
    try {
      const session = await this.authService.googleOAuthCallback(request.user);
      const redirectUrl = this.authService.buildGoogleOAuthSuccessRedirectUrl(session);

      if (redirectUrl) {
        return response.redirect(302, redirectUrl);
      }

      return response.status(200).json(session);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'google_oauth_failed';
      const redirectUrl = this.authService.buildGoogleOAuthFailureRedirectUrl(message);
      if (redirectUrl) {
        return response.redirect(302, redirectUrl);
      }

      throw error;
    }
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate access and refresh tokens' })
  @ApiOkResponse({ type: TokenPairResponseDto })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto);
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke the provided refresh token' })
  @ApiOkResponse({ type: SuccessResponseDto })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiOkResponse({ type: ForgotPasswordResponseDto })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset a password using a valid reset token' })
  @ApiOkResponse({ type: SuccessResponseDto })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
