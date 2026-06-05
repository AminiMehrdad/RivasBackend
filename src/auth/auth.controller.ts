import {
  Body,
  Controller,
  Get,
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
import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CookieUtils } from '../common/utils/cockes.utils';
import { isBtcAddress } from 'class-validator';
import { AuthenticatedRequest } from 'src/common/guards/auth.guard';

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
  private readonly cookieUtils = new CookieUtils();

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  @Public()
  @Post('request-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a one-time verification code to a phone number.' })
  @ApiOkResponse({ type: OtpResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorSchema, description: 'Validation failed.' })
  requestCode(@Body() dto: RequestOtpDto): Promise<OtpResponseDto> {
    return this.authService.requestOtp(dto);
  }

  @Public()
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

    this.cookieUtils.setCookie(response, AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE, result.tokens.refreshToken, this.cookieUtils.cookieOptions(this.configService));
    this.cookieUtils.setCookie(response, AUTH_CONSTANTS.ACCESS_TOKEN_COOKIE, result.tokens.accessToken, this.cookieUtils.cookieOptions(this.configService, true));
    
    return result;
  }

  // @Roles('admin')
  @Get('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiCookieAuth(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE)
  @ApiOperation({ summary: 'Logout by blacklisting access token and revoking refresh token.' })
  @ApiOkResponse({ type: LogoutResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorSchema, description: 'Authentication is required.' })
  @ApiForbiddenResponse({ type: ErrorSchema, description: 'Authenticated user lacks permission.' })
  @ApiBadRequestResponse({ type: ErrorSchema })
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LogoutResponseDto> {
  
    const refreshToken = this.cookieUtils.getCookie(request, AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE);
    const accessToken = this.cookieUtils.getCookie(request, AUTH_CONSTANTS.ACCESS_TOKEN_COOKIE);


    await this.authService.logout(accessToken, refreshToken);

    this.cookieUtils.clearCookie(response, AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE, this.cookieUtils.cookieOptions(this.configService));
    this.cookieUtils.clearCookie(response, AUTH_CONSTANTS.ACCESS_TOKEN_COOKIE, this.cookieUtils.cookieOptions(this.configService, true));

    return { success: true };
  }
}
