import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { INJECTION_TOKENS } from '../common/constants/injection-tokens';
import { ApiKeyEntity } from '../database/entities/apikey.entity';
import { ApiKeyController } from './apiKey.controller';
import { ApiKeyService } from './apiKey.service';
import { TypeOrmApiKeyRepository } from '../database/Repos/apikey.repo';
import { RedisModule } from '../redis/redis.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKeyEntity]), RedisModule, AuthModule],
  controllers: [ApiKeyController],
  providers: [
    ApiKeyService,
    {
      provide: INJECTION_TOKENS.API_KEY_REPOSITORY,
      useClass: TypeOrmApiKeyRepository,
    },
  ],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}
