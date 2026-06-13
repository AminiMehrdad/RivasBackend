import { DeepPartial, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { TranscribeEntity, TranscriptionStatus } from "../entities/transcribe.entity";

// ── Input DTOs ────────────────────────────────────────────────────────────────

export interface CreateTranscribeInput {
    inputUrl: string;
    outputUrl?: string;
    status?: TranscriptionStatus;
    requestId: string;
    duration?: number;
    errorMessage?: string
}

// ── Contract interface ────────────────────────────────────────────────────────

export interface TranscribeRepository {
    createTranscribe(input: CreateTranscribeInput): Promise<TranscribeEntity>;
    getTranscribeById(uniqueId: string): Promise<TranscribeEntity | null>;
    getTodayDurationByUserId(userId: string): Promise<number>;
    getAllTranscribes(): Promise<TranscribeEntity[]>;
    updateTranscribe(uniqueId: string, data: Partial<TranscribeEntity>): Promise<TranscribeEntity>;
    deleteTranscribe(uniqueId: string): Promise<void>;
    markProcessing(uniqueId: string): Promise<void>;
    markCompleted(uniqueId: string, outputUrl: string): Promise<void>;
    markFailed(uniqueId: string, errorMessage: string): Promise<void>;
    findbyUserId(userId: string): Promise<TranscribeEntity[]>
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
            duration: input.duration,
            errorMessage: input.errorMessage

        } as DeepPartial<TranscribeEntity>);

        return this.repository.save(transcribe);
    }

    // READ 
    async getTranscribeById(uniqueId: string): Promise<TranscribeEntity | null> {
        return this.repository.findOne({
            where: { uniqueId },
        });
    }

    async getTodayDurationByUserId(userId: string): Promise<number> {
        const { startOfDay, endOfDay } = this.getTodayRange();

        const result = await this.repository
            .createQueryBuilder('transcribes')
            .innerJoin('transcribes.request', 'requests')
            .select('SUM(transcribes.duration)', 'totalDuration')
            .where('requests.userId = :userId', { userId })
            .andWhere('requests.createdAt >= :startOfDay', { startOfDay })
            .andWhere('requests.createdAt <= :endOfDay', { endOfDay })
            .getRawOne<{ totalDuration: string | null }>();

        return Number(result?.totalDuration || 0);
    }

    async getAllTranscribes(): Promise<TranscribeEntity[]> {
        return this.repository.find();
    }

    async findbyUserId(userId: string): Promise<TranscribeEntity[]> {
        return this.repository
            .createQueryBuilder('transcribes')
            .innerJoin('transcribes.request', 'requests')
            .where('requests.userId = :userId', { userId })
            .getMany();
    }

    // MARK
    async markProcessing(uniqueId: string): Promise<void> {
        await this.repository.update({ uniqueId }, {
            status: TranscriptionStatus.PROCESSING,
        })
    }

    async markCompleted(uniqueId: string, outputUrl: string): Promise<void> {
        await this.repository.update({ uniqueId }, {
            status: TranscriptionStatus.COMPLETED,
            outputUrl,
        });
    }

    async markFailed(uniqueId: string, errorMessage: string): Promise<void> {
        await this.repository.update({ uniqueId }, {
            status: TranscriptionStatus.FAILED,
            errorMessage,
        });
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

    private getTodayRange(): { startOfDay: Date; endOfDay: Date } {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        return { startOfDay, endOfDay };
    }
}


