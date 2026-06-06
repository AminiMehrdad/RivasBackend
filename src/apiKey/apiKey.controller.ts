 import {
   Controller,
   Post,
   Get,
   Delete,
   Param,
   Body,
   Req,
   HttpCode,
   HttpStatus,
   UsePipes,
 } from '@nestjs/common';
 import {
   ApiTags,
   ApiOperation,
   ApiOkResponse,
   ApiCreatedResponse,
   ApiBearerAuth,
   ApiUnauthorizedResponse,
   ApiBadRequestResponse,
 } from '@nestjs/swagger';
 import { ApiKeyService } from './apiKey.service';
 import { AuthenticatedRequest } from '../common/guards/auth.guard';
 import {
   CreateApiKeyDto,
   CreateApiKeyResponseDto,
   ApiKeyListResponseDto,
   RevokeApiKeyResponseDto,
 } from './apiKey.dto';
 import { AppValidationPipe } from '../common/pipes/validation.pipe';
 
 @ApiTags('api-keys')
 @Controller('api-keys')
 @ApiBearerAuth()
 @UsePipes(AppValidationPipe)
 export class ApiKeyController {
   constructor(private readonly apiKeyService: ApiKeyService) {}
 
   @Post()
   @HttpCode(HttpStatus.CREATED)
   @ApiOperation({ summary: 'Generate a new API key for the authenticated user' })
   @ApiCreatedResponse({ type: CreateApiKeyResponseDto })
   @ApiUnauthorizedResponse({ description: 'User not authenticated' })
   async create(
     @Body() dto: CreateApiKeyDto,
     @Req() req: AuthenticatedRequest,
   ): Promise<CreateApiKeyResponseDto> {
     const userId = req.user?.userId;
     if (!userId) {
       throw new Error('User not authenticated');
     }
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
     const userId = req.user?.userId;
     if (!userId) {
       throw new Error('User not authenticated');
     }
    const keys = await this.apiKeyService.listForUser(userId);
    const normalized = keys.map((k) => ({ ...k, id: String(k.id) }));
    return { keys: normalized };
   }
 
   @Delete(':uniqueId')
   @HttpCode(HttpStatus.OK)
   @ApiOperation({ summary: 'Revoke an API key' })
   @ApiOkResponse({ type: RevokeApiKeyResponseDto })
   @ApiUnauthorizedResponse({ description: 'User not authenticated' })
   @ApiBadRequestResponse({ description: 'API key not found or already revoked' })
   async revoke(
     @Param('uniqueId') uniqueId: string,
     @Req() req: AuthenticatedRequest,
   ): Promise<RevokeApiKeyResponseDto> {
     const userId = req.user?.userId;
     if (!userId) {
       throw new Error('User not authenticated');
     }
     return this.apiKeyService.revoke(uniqueId, userId);
   }
 }
