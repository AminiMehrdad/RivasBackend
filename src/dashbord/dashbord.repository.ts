import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestsEntity } from '../database/entities/requests.entity';
import { TranscribeEntity } from '../database/entities/transcribe.entity';

export interface DashbordRepository {
  getTodayCostByUserId(userId: string): Promise<number>;
  getTodayDurationByUserId(userId: string): Promise<number>;
  getTodayRequestsCountByUserId(userId: string): Promise<number>;
}

@Injectable()
export class TypeOrmDashbordRepository implements DashbordRepository {
  constructor(
    @InjectRepository(RequestsEntity)
    private readonly requestsRepository: Repository<RequestsEntity>,
    @InjectRepository(TranscribeEntity)
    private readonly transcribeRepository: Repository<TranscribeEntity>,
  ) {}

  async getTodayCostByUserId(userId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const result = await this.requestsRepository
      .createQueryBuilder('requests')
      .innerJoin('requests.user', 'user')
      .select('SUM(requests.cost)', 'totalCost')
      .where('user.id = :userId', { userId })
      .andWhere('requests.createdAt >= :startOfDay', { startOfDay })
      .andWhere('requests.createdAt <= :endOfDay', { endOfDay })
      .getRawOne();

    return Number(result?.totalCost || 0);
  }

  async getTodayDurationByUserId(userId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const result = await this.transcribeRepository
      .createQueryBuilder('transcribes')
      .innerJoin('transcribes.requst', 'requests')
      .innerJoin('requests.user', 'user')
      .select('SUM(transcribes.duration)', 'totalDuration')
      .where('user.id = :userId', { userId })
      .andWhere('requests.createdAt >= :startOfDay', { startOfDay })
      .andWhere('requests.createdAt <= :endOfDay', { endOfDay })
      .getRawOne();

    return Number(result?.totalDuration || 0);
  }

  async getTodayRequestsCountByUserId(userId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const count = await this.requestsRepository
      .createQueryBuilder('requests')
      .innerJoin('requests.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('requests.createdAt >= :startOfDay', { startOfDay })
      .andWhere('requests.createdAt <= :endOfDay', { endOfDay })
      .getCount();

    return count;
  }
}
