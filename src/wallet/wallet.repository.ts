import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { WalletEntity } from "src/database/entities/wallet.entity";
import { TransactionDirection, TransactionReferenceType, TransactionType, WalletTransactionEntity } from "src/database/entities/walletTransaction.entity";
import { dateUtils } from "src/common/utils/date.util";
import { Repository } from "typeorm";
import { CreditLogResponseDto } from "./wallet.dto";
import { RequestsEntity, RequestStatus } from "src/database/entities/requests.entity";
import { randomUUID } from "crypto";
import { UserEntity } from "src/database/entities/user.entity";


export interface WalletRepository {
    getTotalCredit(userId: string): Promise<number>
    getLogCredit(userId: string): Promise<CreditLogResponseDto[]>
}

@Injectable()
export class TypeOrmWalletRepository implements WalletRepository {
    constructor(
        @InjectRepository(WalletEntity)
        private readonly walletRepository: Repository<WalletEntity>,

        @InjectRepository(WalletTransactionEntity)
        private readonly walletTransactionRepository: Repository<WalletTransactionEntity>,

        @InjectRepository(UserEntity)
        private readonly userEntity: Repository<UserEntity>,

        @InjectRepository(RequestsEntity)
        private readonly requstsEntity: Repository<RequestsEntity>
    ) {}

    async getTotalCredit(userId: string): Promise<number> {
        const result = await this.walletRepository
            .createQueryBuilder("requests")
            .innerJoin('requests.user', 'user')
            .where("user.id = :userId", {userId})
            .select("requests.balance", "totalcredit")
            .getRawOne()

        return Number(result?.totalcredit || 0)
    }

    async getLogCredit(userId: string): Promise<CreditLogResponseDto[]> {
        const logs = await this.walletTransactionRepository
            .createQueryBuilder("walletTransaction")
            .innerJoin("walletTransaction.wallet", "wallet")
            .innerJoin("wallet.user", "user")
            .where("user.id = :userId", { userId })
            .select("walletTransaction.uniqueId", "unique_id")
            .addSelect("walletTransaction.amount", "amount")
            .addSelect("walletTransaction.balanceAfter", "balance_after")
            .addSelect("walletTransaction.createdAt", "created_at")
            .orderBy("walletTransaction.createdAt", "DESC")
            .getRawMany<{
                unique_id: string;
                amount: string | number;
                balance_after: string | number;
                created_at: Date | string;
            }>();

        return logs.map((log) => {
            const createdAt = new Date(log.created_at);

            return {
                unique_id: log.unique_id,
                amount: Number(log.amount),
                balance_after: Number(log.balance_after),
                created_at: createdAt.toISOString(),
                jalaali_create_at: dateUtils.toJalaliDateTime(createdAt),
            };
        });
    }

    async createRequests(input: CreateRequstInput): Promise<RequestsEntity> {
        const user = await this.userEntity.findOne({ where: { id: input.userId}});

        if (!user) {
            throw new Error(`User with Id ${input.userId} not found`);
        }

        const request = this.requstsEntity.create({
            uniqueId: randomUUID(),
            user: user,
            cost: input.cost,
            status: RequestStatus.PROCESSING,
        });
    }

    async createWalletTranscription(input: CreateWalletTranscriptionInput) : Promise<WalletTransactionEntity> {
        const requst = this.requstsEntity.findOne({ where: {id: input.reqId}});

        const wallet = this.walletRepository.findOne({ where: { userId: input.userId }});

        if(!requst) {
            throw new Error(`Requst with Id ${input.reqId} not found`)
        }

        const walletTranscript = this .walletTransactionRepository.create({
            uniqueId: randomUUID(),
            requst: requst,
            wallet: wallet,
            direction: TransactionDirection.CREDIT,
            amount: input.amount,
            balanceAfter: wallet.balance - input.amount,
            type: TransactionType.DEPOSIT,
            referenceType: TransactionReferenceType.REQUEST
        })
    }
}
