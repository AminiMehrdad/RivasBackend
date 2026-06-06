import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { INJECTION_TOKENS } from "src/common/constants/injection-tokens";
import { EnvConfig } from "src/config/env.schema";
import { RequestsEntity } from "src/database/entities/requests.entity";
import { UserEntity } from "src/database/entities/user.entity";
import { WalletEntity } from "src/database/entities/wallet.entity";
import { WalletTransactionEntity } from "src/database/entities/walletTransaction.entity";
import { WalletController } from "./wallet.controller";
import { WalletService } from "./wallet.service";
import { TypeOrmRequestRepository } from "src/database/Repos/requests.repo";
import { TypeOrmWalletRepository } from "src/database/Repos/wallet.repo";
import { TypeOrmWalletTransactionRepository } from "src/database/Repos/walletTransaction.repo";


@Module({
    imports: [
        TypeOrmModule.forFeature([UserEntity, RequestsEntity, WalletEntity, WalletTransactionEntity]),
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
        {
            provide: INJECTION_TOKENS.REQUEST_REPOSITORY,
            useClass: TypeOrmRequestRepository,
        },
        {
            provide: INJECTION_TOKENS.WALLET_TRANSACTION_REPOSITORY,
            useClass: TypeOrmWalletTransactionRepository,
        },
    ],
})
export class WalletModule {}
