import { WalletEntity, WalletType } from "../entities/wallet.entity";
import { DeepPartial, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";

// ── Input DTOs ────────────────────────────────────────────────────────────────

export interface CreateWalletInput {
    userId: string;
    requestId: string;
    type: WalletType;
    balance: number;
}

// ── Contract interface ────────────────────────────────────────────────────────

export interface WalletRepository {
    createWallet(input: CreateWalletInput): Promise<WalletEntity>;
    getWalletByUserId(userId: string): Promise<WalletEntity[]>;
    getWalletById(uniqueId: string): Promise<WalletEntity | null>;
    getAllWallets(): Promise<WalletEntity[]>;
    updateWallet(uniqueId: string, data: Partial<WalletEntity>): Promise<WalletEntity>;
    deleteWallet(uniqueId: string): Promise<void>;
}

// ── Implementation ────────────────────────────────────────────────────────────

@Injectable()
export class TypeOrmWalletRepository implements WalletRepository {
    constructor(
        @InjectRepository(WalletEntity)
        private readonly repository: Repository<WalletEntity>,
    ) { }

    // CREATE
    async createWallet(input: CreateWalletInput): Promise<WalletEntity> {
        const wallet = this.repository.create({
            uniqueId: randomUUID(),
            userId: input.userId,
            requestId: input.requestId,
            type: input.type,
            balance: input.balance,
        } as DeepPartial<WalletEntity>);

        return this.repository.save(wallet);
    }

    // READ — by user
    async getWalletByUserId(userId: string): Promise<WalletEntity[]> {
        return this.repository.find({
            where: { userId },
        });
    }

    // READ — single
    async getWalletById(uniqueId: string): Promise<WalletEntity | null> {
        return this.repository.findOne({
            where: { uniqueId },
        });
    }

    // READ — all
    async getAllWallets(): Promise<WalletEntity[]> {
        return this.repository.find();
    }

    // UPDATE
    async updateWallet(
        uniqueId: string,
        data: Partial<WalletEntity>,
    ): Promise<WalletEntity> {
        const existing = await this.repository.findOneBy({ uniqueId });

        if (!existing) {
            throw new NotFoundException(`Wallet #${uniqueId} not found`);
        }

        const updated = this.repository.merge(existing, data);
        return this.repository.save(updated);
    }

    // DELETE
    async deleteWallet(uniqueId: string): Promise<void> {
        const existing = await this.repository.findOneBy({ uniqueId });

        if (!existing) {
            throw new NotFoundException(`Wallet #${uniqueId} not found`);
        }

        await this.repository.remove(existing);
    }
}
