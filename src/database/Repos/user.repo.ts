import { WalletEntity, WalletType } from "../entities/wallet.entity";
import { DeepPartial, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { WalletRepository } from "./wallet.repo";
import { UserEntity } from "../entities/user.entity";

// ── Input DTOs ────────────────────────────────────────────────────────────────

export interface CreateUserInput {
    phoneNumber: string;
}

// ── Contract interface ────────────────────────────────────────────────────────

export interface userRepository {
    createUser(input: CreateUserInput): Promise<UserEntity>;
    getUserById(uniqueId: string): Promise<UserEntity | null>;
    getUserByPhoneNumber(phoneNumber: string): Promise<UserEntity | null>;
    getAllUsers(): Promise<UserEntity[]>;
    updateUser(uniqueId: string, data: Partial<UserEntity>): Promise<UserEntity>;
    deleteUser(uniqueId: string): Promise<void>;
}

// ── Implementation ────────────────────────────────────────────────────────────

@Injectable()
export class TypeOrmUserRepository implements userRepository {
    constructor(
        @InjectRepository(UserEntity)
        private readonly repository: Repository<UserEntity>,
    ) { }

    // CREATE
    async createUser(input: CreateUserInput): Promise<UserEntity> {
        const user = this.repository.create({
            uniqueId: randomUUID(),
            phoneNumber: input.phoneNumber,
        } as DeepPartial<UserEntity>);

        return this.repository.save(user);
    }

    // READ — by user
    async getUserById(uniqueId: string): Promise<UserEntity | null> {
        return this.repository.findOne({
            where: { uniqueId },
        });
    }

    async getUserByPhoneNumber(phoneNumber: string): Promise<UserEntity | null> {
        return this.repository.findOne({
            where: { phoneNumber },
        });
    }

    // READ — all
    async getAllUsers(): Promise<UserEntity[]> {
        return this.repository.find();
    }

    // UPDATE
    async updateUser(
        uniqueId: string,
        data: Partial<UserEntity>,
    ): Promise<UserEntity> {
        const existing = await this.repository.findOneBy({ uniqueId });

        if (!existing) {
            throw new NotFoundException(`User #${uniqueId} not found`);
        }

        const updated = this.repository.merge(existing, data);
        return this.repository.save(updated);
    }

    // DELETE
    async deleteUser(uniqueId: string): Promise<void> {
        const existing = await this.repository.findOneBy({ uniqueId });

        if (!existing) {
            throw new NotFoundException(`User #${uniqueId} not found`);
        }

        await this.repository.remove(existing);
    }
}


