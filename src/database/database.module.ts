import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvConfig } from '../config/env.schema';
import { UserEntity } from './entities/user.entity';
import { RequestsEntity } from './entities/requests.entity';
import { ApiKeyEntity } from './entities/apikey.entity';
import { TranscribeEntity } from './entities/transcribe.entity';
import { WalletEntity } from './entities/wallet.entity';
import { WalletTransactionEntity } from './entities/walletTransaction.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvConfig, true>) => ({
        type: 'mysql',
        host: configService.get('DB_HOST', { infer: true }),
        port: configService.get('DB_PORT', { infer: true }),
        username: configService.get('DB_USERNAME', { infer: true }),
        password: configService.get('DB_PASSWORD', { infer: true }),
        database: configService.get('DB_DATABASE', { infer: true }),
        entities: [
          UserEntity, 
          RequestsEntity,
          ApiKeyEntity,
          TranscribeEntity,
          WalletEntity,
          WalletTransactionEntity
        ],
        // synchronize: configService.get('DB_SYNCHRONIZE', { infer: true }),
        synchronize: true,
        logging: configService.get('NODE_ENV', { infer: true }) !== 'production',
      }),
    }),
  ],
})
export class DatabaseModule {}
