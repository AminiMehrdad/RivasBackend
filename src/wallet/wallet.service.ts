import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { INJECTION_TOKENS } from 'src/common/constants/injection-tokens';
import {
  CreditLogsResponseDto,
  IncreaseWalletResponseDto,
  TotalCreditResponseDto,
} from './wallet.dto';
import { RequestRepository } from 'src/database/Repos/requests.repo';
import { WalletRepository } from 'src/database/Repos/wallet.repo';
import { WalletTransactionRepository } from 'src/database/Repos/walletTransaction.repo';
import {
  ModuleType,
  RequestStatus,
} from 'src/database/entities/requests.entity';
import {
  TransactionDirection,
  TransactionType,
} from 'src/database/entities/walletTransaction.entity';
import { dateUtils } from 'src/common/utils/date.util';

@Injectable()
export class WalletService {
  constructor(
    @Inject(INJECTION_TOKENS.WALLET_REPOSITORY)
    private readonly walletRepository: WalletRepository,
    @Inject(INJECTION_TOKENS.REQUEST_REPOSITORY)
    private readonly requestRepository: RequestRepository,
    @Inject(INJECTION_TOKENS.WALLET_TRANSACTION_REPOSITORY)
    private readonly walletTransactionRepository: WalletTransactionRepository,
  ) {}

  async totalCredit(userId: string): Promise<TotalCreditResponseDto> {
    const transactions =
      (await this.walletTransactionRepository.getTransactionsByUserId(
        userId,
      )) ?? [];

    return {
      total_credit: transactions.reduce(
        (sum, tx) => Number(sum) + Number(tx.amount),
        0,
      ),
    };
  }

  async logCredits(userId: string): Promise<CreditLogsResponseDto> {
    const transactions =
      (await this.walletTransactionRepository.getTransactionsByUserId(
        userId,
      )) ?? [];
    return {
      logs: transactions.map((tx) => ({
        unique_id: tx.uniqueId,
        amount: Number(tx.amount),
        balance_after: Number(tx.balanceAfter),
        created_at: tx.createdAt.toISOString(),
        jalaali_create_at: dateUtils.toJalaliDateTime(tx.createdAt),
      })),
    };
  }

  async increaseWallet(
    userId: string,
    amount: number,
  ): Promise<IncreaseWalletResponseDto> {
    const wallet = await this.walletRepository.getMainWalletByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found.');
    }

    const currentBalance = Number(wallet.balance);
    const nextBalance = currentBalance + amount;

    const request = await this.requestRepository.createRequest({
      userId,
      cost: amount,
      moduleType: ModuleType.WALLET_TOP_UP,
      moduleId: null,
      status: RequestStatus.PROCESSING,
      succeedAt: null,
      failedAt: null,
    });

    try {
      const transaction =
        await this.walletTransactionRepository.createTransaction({
          walletId: wallet.uniqueId,
          requestId: request.uniqueId,
          amount,
          balanceAfter: nextBalance,
          type: TransactionType.DEPOSIT,
          direction: TransactionDirection.CREDIT,
        });

      await this.walletRepository.updateWallet(wallet.uniqueId, {
        balance: nextBalance,
      });

      await this.requestRepository.updateRequest(request.uniqueId, {
        status: RequestStatus.SUCCEED,
        succeedAt: new Date(),
        walletTransactionId: transaction.uniqueId,
      });

      return {
        request_id: request.uniqueId,
        transaction_id: transaction.uniqueId,
        balance_after: nextBalance,
      };
    } catch (error) {
      await this.requestRepository.updateRequest(request.uniqueId, {
        status: RequestStatus.FAILED,
        failedAt: new Date(),
      });

      throw error;
    }
  }
}
