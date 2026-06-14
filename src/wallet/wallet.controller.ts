import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AUTH_CONSTANTS } from 'src/common/constants/auth.constants';
import { ErrorCode } from 'src/common/errors/error-code.enum';
import { AuthenticatedRequest } from 'src/common/guards/auth.guard';
import { AppValidationPipe } from 'src/common/pipes/validation.pipe';
import { getAuthenticatedUserId } from 'src/common/utils/request-user.util';
import {
  CreditLogsResponseDto,
  IncreaseWalletDto,
  IncreaseWalletResponseDto,
  TotalCreditResponseDto,
} from './wallet.dto';
import { WalletService } from './wallet.service';

class ErrorSchema {
  @ApiProperty({ example: 401 })
  statusCode: number;

  @ApiProperty({ enum: ErrorCode, example: ErrorCode.UNAUTHORIZED })
  code: ErrorCode | string;

  @ApiProperty({ example: 'Authentication is required.' })
  message: string;
}

@ApiTags('wallet')
@Controller('wallet')
@UsePipes(AppValidationPipe)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('total-credit')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiCookieAuth(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE)
  @ApiOperation({ summary: 'Get total credit.' })
  @ApiOkResponse({ type: TotalCreditResponseDto })
  @ApiUnauthorizedResponse({
    type: ErrorSchema,
    description: 'Authentication is required.',
  })
  @ApiForbiddenResponse({
    type: ErrorSchema,
    description: 'Authenticated user lacks permission.',
  })
  @ApiBadRequestResponse({ type: ErrorSchema })
  totalCredit(
    @Req() request: AuthenticatedRequest,
  ): Promise<TotalCreditResponseDto> {
    return this.walletService.totalCredit(getAuthenticatedUserId(request));
  }

  @Get('log-credit')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiCookieAuth(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE)
  @ApiOperation({ summary: 'Get wallet transaction history.' })
  @ApiOkResponse({ type: CreditLogsResponseDto })
  @ApiUnauthorizedResponse({
    type: ErrorSchema,
    description: 'Authentication is required.',
  })
  @ApiForbiddenResponse({
    type: ErrorSchema,
    description: 'Authenticated user lacks permission.',
  })
  @ApiBadRequestResponse({ type: ErrorSchema })
  logCredit(
    @Req() request: AuthenticatedRequest,
  ): Promise<CreditLogsResponseDto> {
    return this.walletService.logCredits(getAuthenticatedUserId(request));
  }

  @Post('increase-wallet')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiCookieAuth(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE)
  @ApiOperation({ summary: 'Increase wallet balance.' })
  @ApiOkResponse({ type: IncreaseWalletResponseDto })
  @ApiUnauthorizedResponse({
    type: ErrorSchema,
    description: 'Authentication is required.',
  })
  @ApiForbiddenResponse({
    type: ErrorSchema,
    description: 'Authenticated user lacks permission.',
  })
  @ApiBadRequestResponse({ type: ErrorSchema })
  increaseWallet(
    @Body() dto: IncreaseWalletDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<IncreaseWalletResponseDto> {
    return this.walletService.increaseWallet(
      getAuthenticatedUserId(request),
      dto.value,
    );
  }
}
