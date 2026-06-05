import { DeepPartial, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { ApiKeyEntity } from "../entities/apikey.entity";



// ── Input DTOs ────────────────────────────────────────────────────────────────

export interface CreateApiKeyInput {
    userId: string;
    name: string;
    apiKeyPreview: string;
    apiKeyHash: string;
}

// ── Contract interface ────────────────────────────────────────────────────────

export interface ApiKeyRepository {
    createApiKey(input: CreateApiKeyInput): Promise<ApiKeyEntity>;
    getApiKeyById(uniqueId: string): Promise<ApiKeyEntity | null>;
    getApiKeyByHash(apiKeyHash: string): Promise<ApiKeyEntity | null>;
    getApiKeysByUserId(userId: string): Promise<ApiKeyEntity[]>;
    getAllApiKeys(): Promise<ApiKeyEntity[]>;
    updateApiKey(uniqueId: string, data: Partial<ApiKeyEntity>): Promise<ApiKeyEntity>;
    deleteApiKey(uniqueId: string): Promise<void>;
}

// ── Implementation ────────────────────────────────────────────────────────────

@Injectable()
export class TypeOrmApiKeyRepository implements ApiKeyRepository {
    constructor(
        @InjectRepository(ApiKeyEntity)
        private readonly repository: Repository<ApiKeyEntity>,
    ) { }

    // CREATE
    async createApiKey(input: CreateApiKeyInput): Promise<ApiKeyEntity> {
        const apiKey = this.repository.create({
            uniqueId: randomUUID(),
            userId: input.userId,
            name: input.name,
            apiKeyPreview: input.apiKeyPreview,
            apiKeyHash: input.apiKeyHash,
        } as DeepPartial<ApiKeyEntity>);

        return this.repository.save(apiKey);
    }

    // READ 
    async getApiKeyById(uniqueId: string): Promise<ApiKeyEntity | null> {
        return this.repository.findOne({
            where: { uniqueId },
        });
    }

    async getApiKeyByHash(apiKeyHash: string): Promise<ApiKeyEntity | null> {
        return this.repository.findOne({
            where: { apiKeyHash },
        });
    }

    async getApiKeysByUserId(userId: string): Promise<ApiKeyEntity[]> {
        return this.repository.find({
            where: { userId },
        });
    }

    async getAllApiKeys(): Promise<ApiKeyEntity[]> {
        return this.repository.find();
    }

    // UPDATE
    async updateApiKey(
        uniqueId: string,
        data: Partial<ApiKeyEntity>,
    ): Promise<ApiKeyEntity> {
        const existing = await this.repository.findOneBy({ uniqueId });

        if (!existing) {
            throw new NotFoundException(`Api Key #${uniqueId} not found`);
        }

        const updated = this.repository.merge(existing, data);
        return this.repository.save(updated);
    }

    // DELETE
    async deleteApiKey(uniqueId: string): Promise<void> {
        const existing = await this.repository.findOneBy({ uniqueId });

        if (!existing) {
            throw new NotFoundException(`Api Key #${uniqueId} not found`);
        }

        await this.repository.remove(existing);
    }
}


