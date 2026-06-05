import { DeepPartial, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { TranscribeEntity } from "../entities/transcribe.entity";

// ── Input DTOs ────────────────────────────────────────────────────────────────

export interface CreateTranscribeInput {
    inputUrl: string;
    outputUrl?: string;
    status?: string;
    requestId: string;
}

// ── Contract interface ────────────────────────────────────────────────────────

export interface TranscribeRepository {
    createTranscribe(input: CreateTranscribeInput): Promise<TranscribeEntity>;
    getTranscribeById(uniqueId: string): Promise<TranscribeEntity | null>;
    getAllTranscribes(): Promise<TranscribeEntity[]>;
    updateTranscribe(uniqueId: string, data: Partial<TranscribeEntity>): Promise<TranscribeEntity>;
    deleteTranscribe(uniqueId: string): Promise<void>;
}

// ── Implementation ────────────────────────────────────────────────────────────

@Injectable()
export class TypeOrmTranscribeRepository implements TranscribeRepository {
    constructor(
        @InjectRepository(TranscribeEntity)
        private readonly repository: Repository<TranscribeEntity>,
    ) { }

    // CREATE
    async createTranscribe(input: CreateTranscribeInput): Promise<TranscribeEntity> {
        const transcribe = this.repository.create({
            uniqueId: randomUUID(),
            inputUrl: input.inputUrl,
            outputUrl: input.outputUrl,
            status: input.status,
            requestId: input.requestId,
        } as DeepPartial<TranscribeEntity>);

        return this.repository.save(transcribe);
    }

    // READ 
    async getTranscribeById(uniqueId: string): Promise<TranscribeEntity | null> {
        return this.repository.findOne({
            where: { uniqueId },
        });
    }

    async getAllTranscribes(): Promise<TranscribeEntity[]> {
        return this.repository.find();
    }


    // UPDATE
    async updateTranscribe(
        uniqueId: string,
        data: Partial<TranscribeEntity>,
    ): Promise<TranscribeEntity> {
        const existing = await this.repository.findOneBy({ uniqueId });

        if (!existing) {
            throw new NotFoundException(`Transcribe #${uniqueId} not found`);
        }

        const updated = this.repository.merge(existing, data);
        return this.repository.save(updated);
    }

    // DELETE
    async deleteTranscribe(uniqueId: string): Promise<void> {
        const existing = await this.repository.findOneBy({ uniqueId });

        if (!existing) {
            throw new NotFoundException(`Transcribe #${uniqueId} not found`);
        }

        await this.repository.remove(existing);
    }
}


