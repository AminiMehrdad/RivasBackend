import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UsePipes,
} from '@nestjs/common';
import {
  ApiProperty,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AUTH_CONSTANTS } from '../common/constants/auth.constants';
import { UnauthorizedError } from '../common/errors/auth.errors';
import { ErrorCode } from '../common/errors/error-code.enum';
import { AppValidationPipe } from '../common/pipes/validation.pipe';
import { EnvConfig } from '../config/env.schema';
import {
  AuthResponseDto,
  LogoutDto,
  LogoutResponseDto,
  OtpResponseDto,
  RefreshResponseDto,
  RefreshTokenDto,
  RequestOtpDto,
  VerifyOtpDto,
} from './auth.dto';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from '../common/middleware/auth-token.middleware';

class ErrorSchema {
  @ApiProperty({ example: 401 })
  statusCode: number;

  @ApiProperty({ enum: ErrorCode, example: ErrorCode.UNAUTHORIZED })
  code: ErrorCode | string;

  @ApiProperty({ example: 'Authentication is required.' })
  message: string;
}

@ApiTags('auth')
@Controller('auth')
@UsePipes(AppValidationPipe)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  @Post('request-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a one-time verification code to a phone number.' })
  @ApiOkResponse({ type: OtpResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorSchema, description: 'Validation failed.' })
  requestCode(@Body() dto: RequestOtpDto): Promise<OtpResponseDto> {
    return this.authService.requestOtp(dto);
  }

  @Post('verify-code')
  @ApiOperation({ summary: 'Verify phone code, create the user if needed, and issue tokens.' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorSchema, description: 'Verification code is invalid or expired.' })
  @ApiForbiddenResponse({ type: ErrorSchema, description: 'Authenticated user lacks permission.' })
  @ApiUnprocessableEntityResponse({ type: ErrorSchema, description: 'Validation failed.' })
  async verifyCode(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.verifyOtp(dto);
    this.setRefreshCookie(response, result.tokens.refreshToken);
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE)
  @ApiOperation({ summary: 'Refresh and rotate access and refresh tokens.' })
  @ApiOkResponse({ type: RefreshResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorSchema, description: 'Refresh token is invalid or expired.' })
  @ApiForbiddenResponse({ type: ErrorSchema, description: 'Authenticated user lacks permission.' })
  @ApiUnprocessableEntityResponse({ type: ErrorSchema, description: 'Validation failed.' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RefreshResponseDto> {
    const refreshToken = dto.refreshToken ?? this.getCookie(request, AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE);
    const result = await this.authService.refresh(refreshToken);
    this.setRefreshCookie(response, result.tokens.refreshToken);
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiCookieAuth(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE)
  @ApiOperation({ summary: 'Logout by blacklisting access token and revoking refresh token.' })
  @ApiOkResponse({ type: LogoutResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorSchema, description: 'Authentication is required.' })
  @ApiForbiddenResponse({ type: ErrorSchema, description: 'Authenticated user lacks permission.' })
  @ApiBadRequestResponse({ type: ErrorSchema })
  async logout(
    @Body() dto: LogoutDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LogoutResponseDto> {
    if (!request.accessToken) {
      throw new UnauthorizedError();
    }

    const refreshToken = dto.refreshToken ?? this.getCookie(request, AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE);
    await this.authService.logout(request.accessToken, refreshToken);
    response.clearCookie(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE, this.cookieOptions());
    return { success: true };
  }

  private setRefreshCookie(response: Response, refreshToken: string): void {
    response.cookie(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE, refreshToken, this.cookieOptions());
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.configService.get('COOKIE_SECURE', { infer: true }),
      sameSite: this.configService.get('COOKIE_SAME_SITE', { infer: true }),
      domain: this.configService.get('COOKIE_DOMAIN', { infer: true }) || undefined,
      maxAge: this.configService.get('REFRESH_TOKEN_TTL_SECONDS', { infer: true }) * 1000,
      path: '/',
    } as const;
  }

  private getCookie(request: Request, name: string): string | undefined {
    const cookies = request.cookies as Record<string, string | undefined> | undefined;
    return cookies?.[name];
  }
}
