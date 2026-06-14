import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { AuthenticatedRequest } from 'src/common/guards/auth.guard';
import { getAuthenticatedUserId } from 'src/common/utils/request-user.util';
import { AUTH_CONSTANTS } from '../common/constants/auth.constants';
import { ErrorCode } from '../common/errors/error-code.enum';
import { AppValidationPipe } from '../common/pipes/validation.pipe';
import { TodayInfoResponseDto } from './dashbord.dto';
import { DashbordService } from './dashbord.service';

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
  constructor(private readonly dashbordService: DashbordService) {}

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
  todayInfo(
    @Req() request: AuthenticatedRequest,
  ): Promise<TodayInfoResponseDto> {
    return this.dashbordService.todayInfo(getAuthenticatedUserId(request));
  }
}
