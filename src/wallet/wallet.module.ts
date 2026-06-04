import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { INJECTION_TOKENS } from "src/common/constants/injection-tokens";
import { AuthGuard } from "src/common/guards/auth.guard";
import { AuthTokenMiddleware } from "src/common/middleware/auth-token.middleware";
import { EnvConfig } from "src/config/env.schema";
import { UserEntity } from "src/database/entities/user.entity";
import { WalletEntity } from "src/database/entities/wallet.entity";
import { WalletTransactionEntity } from "src/database/entities/walletTransaction.entity";
import { WalletController } from "./wallet.controller";
import { WalletService } from "./wallet.service";
import { TypeOrmWalletRepository } from "./wallet.repository";


@Module({
    imports: [
        TypeOrmModule.forFeature([UserEntity, WalletEntity, WalletTransactionEntity]),
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
    controllers: [WalletController],
    providers: [
        WalletService,
        {
            provide: INJECTION_TOKENS.WALLET_REPOSITORY,
            useClass: TypeOrmWalletRepository,
        },
        AuthTokenMiddleware,
        {
            provide: APP_GUARD,
            useClass: AuthGuard,
        },
    ],
})
export class WalletModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthTokenMiddleware).forRoutes('*');
  }
}