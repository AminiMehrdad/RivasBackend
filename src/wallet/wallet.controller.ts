import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UsePipes } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiCookieAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiProperty, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { AUTH_CONSTANTS } from "src/common/constants/auth.constants";
import { ErrorCode } from "src/common/errors/error-code.enum";
import { AppValidationPipe } from "src/common/pipes/validation.pipe";
import { CreditLogsResponseDto, IncreaseWalletDto, IncreaseWalletResponseDto, TotalCreditResponseDto } from "./wallet.dto";
import { WalletService } from "./wallet.service";
import { UnauthorizedError } from "src/common/errors/auth.errors";
import { AuthenticatedRequest } from "src/common/guards/auth.guard";

class ErrorSchema {
    @ApiProperty({ example: 401 })
    statusCode: number;

    @ApiProperty({ enum: ErrorCode, example: ErrorCode.UNAUTHORIZED })
    code: ErrorCode | string;

    @ApiProperty({ example: 'Authentication is required.' })
    message: string;
}

@ApiTags("wallet")
@Controller("wallet")
@UsePipes(AppValidationPipe)
export class WalletController {
    constructor(
        private readonly walletService: WalletService,
    ) { }

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
    async totalCredit(
        @Req() request: AuthenticatedRequest,
    ): Promise<TotalCreditResponseDto> {
        const userId = request.user?.userId;
        if (!userId) {
            throw new UnauthorizedError();
        }
        
        return this.walletService.totalCredit(userId);
    }

    @Get('log-credit')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiCookieAuth(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE)
    @ApiOperation({ summary: 'Get log credit.' })
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
    async logCredit(
        @Req() request: AuthenticatedRequest,
    ): Promise<CreditLogsResponseDto> {
        const userId = request.user?.userId;
        if (!userId) {
            throw new UnauthorizedError();
        }

        return this.walletService.logCredits(userId);
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
    async increaseWallet(
        @Body() dto: IncreaseWalletDto,
        @Req() request: AuthenticatedRequest,
    ): Promise<IncreaseWalletResponseDto> {
        const userId = request.user?.userId;
        if (!userId) {
            throw new UnauthorizedError();
        }

        return this.walletService.increaseWallet(userId, dto.value);
    }

}
