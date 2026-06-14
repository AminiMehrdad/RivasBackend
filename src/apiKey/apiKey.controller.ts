import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AppValidationPipe } from '../common/pipes/validation.pipe';
import { getAuthenticatedUserId } from '../common/utils/request-user.util';
import { AuthenticatedRequest } from '../common/guards/auth.guard';
import {
  ApiKeyListResponseDto,
  CreateApiKeyDto,
  CreateApiKeyResponseDto,
  RevokeApiKeyResponseDto,
} from './apiKey.dto';
import { ApiKeyService } from './apiKey.service';

@ApiTags('api-keys')
@Controller('api-keys')
@ApiBearerAuth()
@UsePipes(AppValidationPipe)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate a new API key for the authenticated user',
  })
  @ApiCreatedResponse({ type: CreateApiKeyResponseDto })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  async create(
    @Body() dto: CreateApiKeyDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<CreateApiKeyResponseDto> {
    const userId = getAuthenticatedUserId(req);
    const created = await this.apiKeyService.generate(
      userId,
      dto.name,
      dto.expiresInDays,
    );

    return { ...created, expiresAt: created.expiresAt ?? undefined };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all API keys for the authenticated user' })
  @ApiOkResponse({ type: ApiKeyListResponseDto })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  async list(@Req() req: AuthenticatedRequest): Promise<ApiKeyListResponseDto> {
    const userId = getAuthenticatedUserId(req);
    const keys = await this.apiKeyService.listForUser(userId);
    const normalized = keys.map((k) => ({ ...k, id: String(k.id) }));

    return { keys: normalized };
  }

  @Delete(':uniqueId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiOkResponse({ type: RevokeApiKeyResponseDto })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiBadRequestResponse({
    description: 'API key not found or already revoked',
  })
  revoke(
    @Param('uniqueId') uniqueId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<RevokeApiKeyResponseDto> {
    return this.apiKeyService.revoke(uniqueId, getAuthenticatedUserId(req));
  }
}
