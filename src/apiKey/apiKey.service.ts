import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import Redis from 'ioredis';
import { INJECTION_TOKENS } from '../common/constants/injection-tokens';
import { ApiKeyRepository } from '../database/Repos/apikey.repo';
import { ApiKeyEntity } from '../database/entities/apikey.entity';

interface GeneratedApiKey {
  apiKey: string;
  id: string;
  hint: string;
  expiresAt: Date | null;
  createdAt: Date;
}

interface ApiKeyListItem {
  id: number;
  uniqueId: string;
  name: string;
  apiKeyPreview: string;
  createdAt: Date;
}

interface RevokeApiKeyResult {
  success: boolean;
  message: string;
}

@Injectable()
export class ApiKeyService {
  constructor(
    @Inject(INJECTION_TOKENS.API_KEY_REPOSITORY)
    private readonly apiKeyRepo: ApiKeyRepository,
    @Inject(INJECTION_TOKENS.REDIS_CLIENT)
    private readonly redisClient: Redis,
    private readonly config: ConfigService,
  ) {}

  async generate(
    userId: string,
    name?: string,
    expiresInDays?: number,
  ): Promise<GeneratedApiKey> {
    void expiresInDays;

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

  async validate(raw: string): Promise<ApiKeyEntity> {
    const hashed = this.hash(raw);
    const max = this.config.get<number>('RATE_LIMIT_MAX') || 60;

    if (!(await this.checkRateLimit(hashed, max))) {
      throw new UnauthorizedException(
        `Rate limit exceeded (max ${max} req/min)`,
      );
    }

    const cachedUserId = await this.getCachedUserId(hashed);
    if (cachedUserId) {
      return {
        userId: cachedUserId,
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

    await this.cacheUserId(hashed, key.userId);

    return key;
  }

  async listForUser(userId: string): Promise<ApiKeyListItem[]> {
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

  async revoke(uniqueId: string, userId: string): Promise<RevokeApiKeyResult> {
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

  private async cacheUserId(hashedKey: string, userId: string): Promise<void> {
    await this.redisClient.set(`apikey:${hashedKey}`, userId, 'EX', 60);
  }

  private getCachedUserId(hashedKey: string): Promise<string | null> {
    return this.redisClient.get(`apikey:${hashedKey}`);
  }

  private async invalidateCache(hashedKey: string): Promise<void> {
    await this.redisClient.del(`apikey:${hashedKey}`);
  }

  private async checkRateLimit(
    hashedKey: string,
    max: number,
  ): Promise<boolean> {
    const redisKey = `ratelimit:${hashedKey}`;
    const current = await this.redisClient.incr(redisKey);

    if (current === 1) {
      await this.redisClient.expire(redisKey, 60);
    }

    return current <= max;
  }

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
