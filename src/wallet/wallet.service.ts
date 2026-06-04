import { Inject, Injectable } from "@nestjs/common";
import { INJECTION_TOKENS } from "src/common/constants/injection-tokens";
import {CreditLogsResponseDto, TotalCreditResponseDto } from "./wallet.dto";
import { WalletRepository } from "./wallet.repository";


@Injectable()
export class WalletService {
    constructor(
        @Inject(INJECTION_TOKENS.WALLET_REPOSITORY)
        private readonly walletRepository: WalletRepository, 
    ) {}

    async totalCredit(userId: string): Promise<TotalCreditResponseDto> {
        return {
            total_credit:await this.walletRepository.getTotalCredit(userId)
        }
    }

    async logCredits(userId: string): Promise<CreditLogsResponseDto> {
        return {
            logs: await this.walletRepository.getLogCredit(userId)
        } 
    }
}