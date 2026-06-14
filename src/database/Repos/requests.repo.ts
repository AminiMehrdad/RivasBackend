import { DeepPartial, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ModuleType,
  RequestsEntity,
  RequestStatus,
} from '../entities/requests.entity';

// ── Input DTOs ────────────────────────────────────────────────────────────────

export interface CreateRequestInput {
  userId: string;
  cost: number;
  moduleType: ModuleType;
  moduleId?: string | null;
  status: RequestStatus;
  succeedAt?: Date | null;
  failedAt?: Date | null;
  transcribeId?: string | null;
  idValidationId?: string | null;
  walletTransactionId?: string | null;
}

// ── Contract interface ────────────────────────────────────────────────────────

export interface RequestRepository {
  createRequest(input: CreateRequestInput): Promise<RequestsEntity>;
  getRequestById(uniqueId: string): Promise<RequestsEntity | null>;
  getRequestsByUserId(userId: string): Promise<RequestsEntity[]>;
  getTodayCostByUserId(userId: string): Promise<number>;
  getTodayRequestsCountByUserId(userId: string): Promise<number>;
  getAllRequests(): Promise<RequestsEntity[]>;
  updateRequest(
    uniqueId: string,
    data: Partial<RequestsEntity>,
  ): Promise<RequestsEntity>;
  deleteRequest(uniqueId: string): Promise<void>;
}

// ── Implementation ────────────────────────────────────────────────────────────

@Injectable()
export class TypeOrmRequestRepository implements RequestRepository {
  constructor(
    @InjectRepository(RequestsEntity)
    private readonly repository: Repository<RequestsEntity>,
  ) {}

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
      transcribeId: input.transcribeId,
      idValidationId: input.idValidationId,
      walletTransactionId: input.walletTransactionId,
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

  async getTodayCostByUserId(userId: string): Promise<number> {
    const { startOfDay, endOfDay } = this.getTodayRange();

    const result = await this.repository
      .createQueryBuilder('requests')
      .select('SUM(requests.cost)', 'totalCost')
      .where('requests.userId = :userId', { userId })
      .andWhere('requests.createdAt >= :startOfDay', { startOfDay })
      .andWhere('requests.createdAt <= :endOfDay', { endOfDay })
      .getRawOne<{ totalCost: string | null }>();

    return Number(result?.totalCost || 0);
  }

  async getTodayRequestsCountByUserId(userId: string): Promise<number> {
    const { startOfDay, endOfDay } = this.getTodayRange();

    return this.repository
      .createQueryBuilder('requests')
      .where('requests.userId = :userId', { userId })
      .andWhere('requests.createdAt >= :startOfDay', { startOfDay })
      .andWhere('requests.createdAt <= :endOfDay', { endOfDay })
      .getCount();
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

  private getTodayRange(): { startOfDay: Date; endOfDay: Date } {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return { startOfDay, endOfDay };
  }
}
