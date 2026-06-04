import { Controller, Get, HttpCode, HttpStatus, Req, UsePipes } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiProperty,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AUTH_CONSTANTS } from '../common/constants/auth.constants';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ErrorCode } from '../common/errors/error-code.enum';
import { AppValidationPipe } from '../common/pipes/validation.pipe';
import { EnvConfig } from '../config/env.schema';
import { TodayInfoResponseDto } from './dashbord.dto';
import { DashbordService } from './dashbord.service';
import { AuthenticatedRequest } from 'src/common/middleware/auth-token.middleware';
import { UnauthorizedError } from 'src/common/errors/auth.errors';

class ErrorSchema {
  @ApiProperty({ example: 401 })
  statusCode: number;

  @ApiProperty({ enum: ErrorCode, example: ErrorCode.UNAUTHORIZED })
  code: ErrorCode | string;

  @ApiProperty({ example: 'Authentication is required.' })
  message: string;
}

@ApiTags('dashbord')
@Controller('dashbord')
@UsePipes(AppValidationPipe)
export class DashbordController {
  constructor(
    private readonly dashbordService: DashbordService,
  ) {}

  @Get('today-info')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiCookieAuth(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE)
  @ApiOperation({ summary: 'Get the nessery info in Dashbord page.' })
  @ApiOkResponse({ type: TodayInfoResponseDto })
  @ApiUnauthorizedResponse({
    type: ErrorSchema,
    description: 'Authentication is required.',
  })
  @ApiForbiddenResponse({
    type: ErrorSchema,
    description: 'Authenticated user lacks permission.',
  })
  @ApiBadRequestResponse({ type: ErrorSchema })
  async todayInfo(
    @CurrentUser() user: { id: string },
    @Req() request: AuthenticatedRequest,
  ): Promise<TodayInfoResponseDto> {
    if (!request.accessToken) {
          throw new UnauthorizedError();
        }
        
    return this.dashbordService.todayInfo(user.id);
  }
}
