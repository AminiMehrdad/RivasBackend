import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  public client: Redis;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
    });
  }

  onModuleDestroy() {
    this.client.quit();
  }

  // Cache a validated API key result for 60s to avoid DB hits on every request
  async cacheKey(hashedKey: string, userId: string) {
    await this.client.set(`apikey:${hashedKey}`, userId, 'EX', 60);
  }

  async getCachedKey(hashedKey: string): Promise<string | null> {
    return this.client.get(`apikey:${hashedKey}`);
  }

  async invalidateCache(hashedKey: string) {
    await this.client.del(`apikey:${hashedKey}`);
  }

  // Rate limiting: max N requests per minute per API key
  async checkRateLimit(hashedKey: string, max: number): Promise<boolean> {
    const redisKey = `ratelimit:${hashedKey}`;
    const current = await this.client.incr(redisKey);
    if (current === 1) {
      await this.client.expire(redisKey, 60); // reset window every 60s
    }
    return current <= max;
  }
}