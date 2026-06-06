 import {
   Injectable,
   UnauthorizedException,
   BadRequestException,
   Inject,
 } from '@nestjs/common';
 import { createHash, randomBytes } from 'crypto';
 import { ConfigService } from '@nestjs/config';
 import { ApiKeyEntity } from '../database/entities/apikey.entity';
 import { ApiKeyRepository } from '../database/Repos/apikey.repo';
 import { INJECTION_TOKENS } from '../common/constants/injection-tokens';
 import Redis from 'ioredis';
 
 @Injectable()
 export class ApiKeyService {
   constructor(
     @Inject(INJECTION_TOKENS.API_KEY_REPOSITORY)
     private readonly apiKeyRepo: ApiKeyRepository,
     @Inject(INJECTION_TOKENS.REDIS_CLIENT)
     private readonly redisClient: Redis,
     private readonly config: ConfigService,
   ) {}
 
   // ─── Generate ────────────────────────────────────────────────────────────────
 
   async generate(userId: string, name?: string, expiresInDays?: number) {
     const raw = `sk_live_${randomBytes(32).toString('hex')}`;
     const hashed = this.hash(raw);
     const preview = raw.slice(-4);
 
     const saved = await this.apiKeyRepo.createApiKey({
       userId,
       name: name ?? 'Untitled API Key',
       apiKeyPreview: preview,
       apiKeyHash: hashed,
     });
 
     return {
       apiKey: raw,
       id: saved.uniqueId,
       hint: saved.apiKeyPreview,
       expiresAt: null,
       createdAt: saved.createdAt,
     };
   }
 
   // ─── Validate (with Redis cache + rate limit) ─────────────────────────────
 
   async validate(raw: string): Promise<ApiKeyEntity> {
     const hashed = this.hash(raw);
     const max = this.config.get<number>('RATE_LIMIT_MAX') || 60;
 
     const allowed = await this.checkRateLimit(hashed, max);
     if (!allowed) {
       throw new UnauthorizedException('Rate limit exceeded (max 60 req/min)');
     }
 
     const cached = await this.getCachedKey(hashed);
     if (cached) {
       return {
         userId: cached,
         apiKeyHash: hashed,
       } as ApiKeyEntity;
     }
 
     const key = await this.apiKeyRepo.getApiKeyByHash(hashed);
 
     if (!key) {
       throw new UnauthorizedException('Invalid or revoked API key');
     }
 
     if (key.deletedAt) {
       throw new UnauthorizedException('API key has been revoked');
     }
 
     await this.cacheKey(hashed, key.userId);
 
     return key;
   }
 
   // ─── List user keys ───────────────────────────────────────────────────────
 
   async listForUser(userId: string) {
     const keys = await this.apiKeyRepo.getApiKeysByUserId(userId);
     
     return keys
       .filter((key) => !key.deletedAt)
       .map((key) => ({
         id: key.id,
         uniqueId: key.uniqueId,
         name: key.name,
         apiKeyPreview: key.apiKeyPreview,
         createdAt: key.createdAt,
       }));
   }
 
   // ─── Revoke (soft delete) ─────────────────────────────────────────────────
 
   async revoke(uniqueId: string, userId: string) {
     const key = await this.apiKeyRepo.getApiKeyById(uniqueId);
     
     if (!key || key.userId !== userId) {
       throw new BadRequestException('API key not found');
     }
 
     if (key.deletedAt) {
       throw new BadRequestException('API key already revoked');
     }
 
     await this.apiKeyRepo.updateApiKey(uniqueId, {
       deletedAt: new Date(),
     });
 
     await this.invalidateCache(key.apiKeyHash);
     
     return {
       success: true,
       message: 'API key revoked successfully',
     };
   }
 
   // ─── Redis Helper Methods ─────────────────────────────────────────────────
 
   private async cacheKey(hashedKey: string, userId: string): Promise<void> {
     await this.redisClient.set(`apikey:${hashedKey}`, userId, 'EX', 60);
   }
 
   private async getCachedKey(hashedKey: string): Promise<string | null> {
     return this.redisClient.get(`apikey:${hashedKey}`);
   }
 
   private async invalidateCache(hashedKey: string): Promise<void> {
     await this.redisClient.del(`apikey:${hashedKey}`);
   }
 
   private async checkRateLimit(hashedKey: string, max: number): Promise<boolean> {
     const redisKey = `ratelimit:${hashedKey}`;
     const current = await this.redisClient.incr(redisKey);
     if (current === 1) {
       await this.redisClient.expire(redisKey, 60);
     }
     return current <= max;
   }
 
   // ─── Util ─────────────────────────────────────────────────────────────────
 
   private hash(raw: string): string {
     return createHash('sha256').update(raw).digest('hex');
   }
 }
