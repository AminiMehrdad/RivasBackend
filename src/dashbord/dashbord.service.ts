import { Inject, Injectable } from '@nestjs/common';
import { INJECTION_TOKENS } from '../common/constants/injection-tokens';
import { TodayInfoResponseDto } from './dashbord.dto';
import { DashbordRepository } from './dashbord.repository';

@Injectable()
export class DashbordService {
  constructor(
    @Inject(INJECTION_TOKENS.DASHBORD_REPOSITORY)
    private readonly dashbordRepository: DashbordRepository,
  ) {}

  async todayInfo(userId: string): Promise<TodayInfoResponseDto> {
    const [costs, totalDurationSeconds, requests] = await Promise.all([
      this.dashbordRepository.getTodayCostByUserId(userId),
      this.dashbordRepository.getTodayDurationByUserId(userId),
      this.dashbordRepository.getTodayRequestsCountByUserId(userId),
    ]);

    const time = this.formatDuration(totalDurationSeconds);

    return {
      costs: Math.round(costs * 100) / 100,
      time,
      requsts: requests,
    };
  }

  private formatDuration(seconds: number): string {
    if (!seconds || seconds === 0) {
      return '0 min';
    }

    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      if (remainingMinutes > 0) {
        return `${hours} hours ${remainingMinutes} min`;
      }
      return `${hours} hours`;
    }

    return `${minutes} min`;
  }
}
