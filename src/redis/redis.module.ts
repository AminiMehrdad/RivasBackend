import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { INJECTION_TOKENS } from '../common/constants/injection-tokens';
import { EnvConfig } from '../config/env.schema';

export class RedisLifecycle implements OnModuleDestroy {
  constructor(
    @Inject(INJECTION_TOKENS.REDIS_CLIENT) private readonly redisClient: Redis,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.redisClient.quit();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: INJECTION_TOKENS.REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvConfig, true>) =>
        new Redis({
          host: configService.get('REDIS_HOST', { infer: true }),
          port: configService.get('REDIS_PORT', { infer: true }),
          password: configService.get('REDIS_PASSWORD', { infer: true }) || undefined,
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
        }),
    },
    RedisLifecycle,
  ],
  exports: [INJECTION_TOKENS.REDIS_CLIENT],
})
export class RedisModule {}
