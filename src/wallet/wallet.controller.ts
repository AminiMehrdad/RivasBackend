import { Controller, Get, HttpCode, HttpStatus, Req, UsePipes } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiCookieAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiProperty, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { AUTH_CONSTANTS } from "src/common/constants/auth.constants";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { ErrorCode } from "src/common/errors/error-code.enum";
import { AppValidationPipe } from "src/common/pipes/validation.pipe";
import { CreditLogsResponseDto, TotalCreditResponseDto } from "./wallet.dto";
import { WalletService } from "./wallet.service";
import { AuthenticatedRequest } from "src/common/middleware/auth-token.middleware";
import { UnauthorizedError } from "src/common/errors/auth.errors";

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
        @CurrentUser() user: { id: string },
        @Req() request: AuthenticatedRequest,
    ): Promise<TotalCreditResponseDto> {
        if (!request.accessToken) {
            throw new UnauthorizedError();
        }

        return this.walletService.totalCredit(user.id);
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
        @CurrentUser() user: { id: string },
        @Req() request: AuthenticatedRequest,
    ): Promise<CreditLogsResponseDto> {
        if (!request.accessToken) {
            throw new UnauthorizedError();
        }

        return this.walletService.logCredits(user.id);
    }


}