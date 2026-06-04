import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { INJECTION_TOKENS } from '../common/constants/injection-tokens';
import { AuthGuard } from '../common/guards/auth.guard';
import { AuthTokenMiddleware } from '../common/middleware/auth-token.middleware';
import { EnvConfig } from '../config/env.schema';
import { UserEntity } from '../database/entities/user.entity';
import { AuthController } from './auth.controller';
import { TypeOrmAuthRepository } from './auth.repository';
import { HttpSmsService } from './sms.service';
import { AuthService } from './auth.service';
import { WalletEntity } from 'src/database/entities/wallet.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, WalletEntity]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvConfig, true>) => ({
        secret: configService.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRES_IN', { infer: true }),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokenMiddleware,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: INJECTION_TOKENS.USER_REPOSITORY,
      useClass: TypeOrmAuthRepository,
    },
    {
      provide: INJECTION_TOKENS.SMS_SERVICE,
      useClass: HttpSmsService,
    },
  ],
  exports: [AuthService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthTokenMiddleware).forRoutes('*');
  }
}
