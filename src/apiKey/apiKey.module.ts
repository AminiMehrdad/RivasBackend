 import { Module } from '@nestjs/common';
 import { TypeOrmModule } from '@nestjs/typeorm';
 import { INJECTION_TOKENS } from '../common/constants/injection-tokens';
 import { ApiKeyEntity } from '../database/entities/apikey.entity';
 import { ApiKeyController } from './apiKey.controller';
 import { ApiKeyService } from './apiKey.service';
 import { TypeOrmApiKeyRepository } from '../database/Repos/apikey.repo';
 import { RedisModule } from '../redis/redis.module';
 import { AuthModule } from '../auth/auth.module';
 import { ApiKeyGuard } from '../common/guards/apiKey.guard';
 
 @Module({
   imports: [
     TypeOrmModule.forFeature([ApiKeyEntity]),
     RedisModule,
     AuthModule,
   ],
   controllers: [ApiKeyController],
   providers: [
     ApiKeyService,
     ApiKeyGuard,
     {
       provide: INJECTION_TOKENS.API_KEY_REPOSITORY,
       useClass: TypeOrmApiKeyRepository,
     },
   ],
   exports: [ApiKeyService, ApiKeyGuard],
 })
 export class ApiKeyModule {}
