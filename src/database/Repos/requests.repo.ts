import { DeepPartial, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { RequestsEntity, RequestStatus } from "../entities/requests.entity";

// ── Input DTOs ────────────────────────────────────────────────────────────────

export interface CreateRequestInput {
    userId: string;
    cost: number;
    moduleType: string;
    moduleId: number;
    status: RequestStatus;
    succeedAt?: Date;
    failedAt?: Date;
}

// ── Contract interface ────────────────────────────────────────────────────────

export interface RequestRepository {
    createRequest(input: CreateRequestInput): Promise<RequestsEntity>;
    getRequestById(uniqueId: string): Promise<RequestsEntity | null>;
    getRequestsByUserId(userId: string): Promise<RequestsEntity[]>;
    getAllRequests(): Promise<RequestsEntity[]>;
    updateRequest(uniqueId: string, data: Partial<RequestsEntity>): Promise<RequestsEntity>;
    deleteRequest(uniqueId: string): Promise<void>;
}

// ── Implementation ────────────────────────────────────────────────────────────

@Injectable()
export class TypeOrmRequestRepository implements RequestRepository {
    constructor(
        @InjectRepository(RequestsEntity)
        private readonly repository: Repository<RequestsEntity>,
    ) { }

    // CREATE
    async createRequest(input: CreateRequestInput): Promise<RequestsEntity> {
        const request = this.repository.create({
            uniqueId: randomUUID(),
            userId: input.userId,
            cost: input.cost,
            moduleType: input.moduleType,
            moduleId: input.moduleId,
            status: input.status,
            succeedAt: input.succeedAt,
            failedAt: input.failedAt,
        } as DeepPartial<RequestsEntity>);

        return this.repository.save(request);
    }

    // READ
    async getRequestById(uniqueId: string): Promise<RequestsEntity | null> {
        return this.repository.findOne({
            where: { uniqueId },
        });
    }

    async getRequestsByUserId(userId: string): Promise<RequestsEntity[]> {
        return this.repository.find({
            where: { userId },
        });
    }

    async getAllRequests(): Promise<RequestsEntity[]> {
        return this.repository.find();
    }

    // UPDATE
    async updateRequest(
        uniqueId: string,
        data: Partial<RequestsEntity>,
    ): Promise<RequestsEntity> {
        const existing = await this.repository.findOneBy({ uniqueId });

        if (!existing) {
            throw new NotFoundException(`Request #${uniqueId} not found`);
        }

        const updated = this.repository.merge(existing, data);
        return this.repository.save(updated);
    }

    // DELETE
    async deleteRequest(uniqueId: string): Promise<void> {
        const existing = await this.repository.findOneBy({ uniqueId });

        if (!existing) {
            throw new NotFoundException(`Request #${uniqueId} not found`);
        }

        await this.repository.remove(existing);
    }
}
