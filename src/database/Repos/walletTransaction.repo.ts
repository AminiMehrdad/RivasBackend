import { Injectable, NotFoundException } from "@nestjs/common";
import {
  TransactionDirection,
  TransactionReferenceType,
  TransactionType,
  WalletTransactionEntity,
} from "../entities/walletTransaction.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { DeepPartial, Repository } from "typeorm";
import { randomUUID } from 'crypto';

// ── Input DTOs ────────────────────────────────────────────────────────────────

export interface CreateWalletTransactionInput {
  walletId: string;
  requestId: string;
  amount: number;
  balanceAfter: number;
  type: TransactionType;
  direction: TransactionDirection;
}

// ── Contract interface ────────────────────────────────────────────────────────

export interface WalletTransactionRepository {
  createTransaction(input: CreateWalletTransactionInput): Promise<WalletTransactionEntity>;
  getTransactionsByWalletId(walletId: string): Promise<WalletTransactionEntity[]>;
  getTransactionById(uniqueId: string): Promise<WalletTransactionEntity | null>;
  getAllTransactions(): Promise<WalletTransactionEntity[]>;
  updateTransaction(uniqueId: string, data: Partial<WalletTransactionEntity>): Promise<WalletTransactionEntity>;
  deleteTransaction(uniqueId: string): Promise<void>;
}

// ── Implementation ────────────────────────────────────────────────────────────

@Injectable()
export class TypeOrmWalletTransactionRepository implements WalletTransactionRepository {
  constructor(
    @InjectRepository(WalletTransactionEntity)
    private readonly repository: Repository<WalletTransactionEntity>,
  ) {}

  // CREATE
  async createTransaction(input: CreateWalletTransactionInput): Promise<WalletTransactionEntity> {
    const transaction = this.repository.create({
      uniqueId:      randomUUID(),
      walletId:      input.walletId,
      referenceId:   input.requestId,
      referenceType: TransactionReferenceType.REQUEST,
      direction:     input.direction,
      amount:        input.amount,
      balanceAfter:  input.balanceAfter,
      type:          input.type,
    } as DeepPartial<WalletTransactionEntity>);

    return this.repository.save(transaction);
  }

  // READ — by wallet
  async getTransactionsByWalletId(walletId: string): Promise<WalletTransactionEntity[]> {
    return this.repository.find({
      where: { walletId },
      order: { createdAt: 'DESC' },
    });
  }

  // READ — single
  async getTransactionById(uniqueId: string): Promise<WalletTransactionEntity | null> {
    return this.repository.findOne({
      where: { uniqueId },
      relations: { request: true, wallet: true },
    });
  }

  // READ — all
  async getAllTransactions(): Promise<WalletTransactionEntity[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  // UPDATE
  async updateTransaction(
    uniqueId: string,
    data: Partial<WalletTransactionEntity>,
  ): Promise<WalletTransactionEntity> {
    const existing = await this.repository.findOneBy({ uniqueId });

    if (!existing) {
      throw new NotFoundException(`WalletTransaction #${uniqueId} not found`);
    }

    const updated = this.repository.merge(existing, data);
    return this.repository.save(updated);
  }

  // DELETE
  async deleteTransaction(uniqueId: string): Promise<void> {
    const existing = await this.repository.findOneBy({ uniqueId });

    if (!existing) {
      throw new NotFoundException(`WalletTransaction #${uniqueId} not found`);
    }

    await this.repository.remove(existing);
  }
}