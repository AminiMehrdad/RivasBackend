 # API Key Service
 
 This module provides API key generation, validation, and management for user authentication.
 
 ## Features
 
 - Generate secure API keys with SHA-256 hashing
 - Redis caching for fast validation (60-second cache)
 - Rate limiting (60 requests per minute per key)
 - Soft delete (revocation) support
 - List user's API keys with safe fields only
 
 ## Endpoints
 
 ### 1. Generate API Key
 
 **POST** `/api-keys`
 
 **Headers:**
 - `Authorization: Bearer <accessToken>` (required)
 - `X-Refresh-Token: <refreshToken>` (required)
 
 **Body:**
 ```json
 {
   "name": "My Production Key",
   "expiresInDays": 90  // optional
 }
 ```
 
 **Response:**
 ```json
 {
   "apiKey": "sk_live_abc123...",  // ⚠️ SHOWN ONLY ONCE - SAVE IT!
   "id": "uuid-123",
   "hint": "xyz9",
   "expiresAt": null,
   "createdAt": "2024-06-07T00:00:00.000Z"
 }
 ```
 
 ### 2. List API Keys
 
 **GET** `/api-keys`
 
 **Headers:**
 - `Authorization: Bearer <accessToken>` (required)
 - `X-Refresh-Token: <refreshToken>` (required)
 
 **Response:**
 ```json
 {
   "keys": [
     {
       "id": 1,
       "uniqueId": "uuid-123",
       "name": "My Production Key",
       "apiKeyPreview": "xyz9",
       "createdAt": "2024-06-07T00:00:00.000Z"
     }
   ]
 }
 ```
 
 ### 3. Revoke API Key
 
 **DELETE** `/api-keys/:uniqueId`
 
 **Headers:**
 - `Authorization: Bearer <accessToken>` (required)
 - `X-Refresh-Token: <refreshToken>` (required)
 
 **Response:**
 ```json
 {
   "success": true,
   "message": "API key revoked successfully"
 }
 ```
 
 ## Using API Keys
 
 To use an API key in protected routes, you need to:
 
 ### 1. Apply the ApiKeyGuard to your controller/route
 
 ```typescript
 import { Controller, Get, UseGuards, Req } from '@nestjs/common';
 import { ApiKeyGuard, ApiKeyRequest } from '../common/guards/apiKey.guard';
 
 @Controller('protected')
 export class ProtectedController {
   @Get('data')
   @UseGuards(ApiKeyGuard)
   getData(@Req() req: ApiKeyRequest) {
     return {
       message: 'Access granted!',
       userId: req.apiKey.userId,
       keyId: req.apiKey.uniqueId,
     };
   }
 }
 ```
 
 ### 2. Send requests with X-API-Key header
 
 ```bash
 curl -H "X-API-Key: sk_live_abc123..." \
      https://your-api.com/protected/data
 ```
 
 ## Security Features
 
 - **SHA-256 Hashing:** Raw keys are never stored in the database
 - **Redis Cache:** Validated keys are cached for 60 seconds to reduce DB load
 - **Rate Limiting:** 60 requests per minute per API key
 - **Soft Delete:** Revoked keys are marked as deleted, not removed
 - **Preview Only:** Only last 4 characters are shown in listings
 
 ## Architecture
 
 ```
 Client Request (X-API-Key)
       ↓
 ApiKeyGuard
       ↓
 ApiKeyService.validate()
       ↓
 1. Check Redis rate limit
 2. Check Redis cache
 3. Query database if cache miss
 4. Verify not soft-deleted
 5. Cache result in Redis
       ↓
 Request proceeds with req.apiKey populated
 ```
 
 ## Configuration
 
 Add to your `.env`:
 
 ```env
 RATE_LIMIT_MAX=60  # Max requests per minute per API key
 REDIS_HOST=localhost
 REDIS_PORT=6379
 ```
 
 ## Database Schema
 
 The `api_keys` table:
 
 | Column | Type | Description |
 |--------|------|-------------|
 | id | int | Primary key (auto-increment) |
 | unique_id | varchar | UUID for external reference |
 | user_id | varchar | Foreign key to users.unique_id |
 | name | varchar | User-provided name |
 | api_key_preview | varchar | Last 4 characters of key |
 | api_key_hash | varchar | SHA-256 hash (unique, indexed) |
 | deleted_at | datetime | Soft delete timestamp |
 | created_at | datetime | Creation timestamp |
 
 ## Testing
 
 ```typescript
 // Example test
 describe('ApiKeyService', () => {
   it('should generate a valid API key', async () => {
     const result = await service.generate('user-123', 'Test Key');
     expect(result.apiKey).toMatch(/^sk_live_[a-f0-9]{64}$/);
     expect(result.hint).toHaveLength(4);
   });
 
   it('should validate cached key without DB hit', async () => {
     // First validation hits DB
     await service.validate(apiKey);
     // Second validation uses Redis cache
     await service.validate(apiKey);
   });
 });
 ```
 
 ## Migration Notes
 
 If migrating from cookie-based auth to API keys:
 
 1. Users must generate API keys via `/api-keys` endpoint (requires JWT auth)
 2. Update client to include `X-API-Key` header instead of cookies
 3. Routes using API keys must apply `@UseGuards(ApiKeyGuard)`
 4. Routes using JWT auth continue to use the existing `AuthGuard`
 
 Both authentication methods can coexist in the same application.
