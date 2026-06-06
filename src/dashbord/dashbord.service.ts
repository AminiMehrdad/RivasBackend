import { Inject, Injectable } from '@nestjs/common';
import { INJECTION_TOKENS } from '../common/constants/injection-tokens';
import { RequestRepository } from '../database/Repos/requests.repo';
import { TranscribeRepository } from '../database/Repos/transcribe.repo';
import { TodayInfoResponseDto } from './dashbord.dto';

@Injectable()
export class DashbordService {
  constructor(
    @Inject(INJECTION_TOKENS.REQUEST_REPOSITORY)
    private readonly requestRepository: RequestRepository,
    @Inject(INJECTION_TOKENS.TRANSCRIBE_REPOSITORY)
    private readonly transcribeRepository: TranscribeRepository,
  ) {}

  async todayInfo(userId: string): Promise<TodayInfoResponseDto> {
    const [costs, totalDurationSeconds, requests] = await Promise.all([
      this.requestRepository.getTodayCostByUserId(userId),
      this.transcribeRepository.getTodayDurationByUserId(userId),
      this.requestRepository.getTodayRequestsCountByUserId(userId),
    ]);

    const time = this.formatDuration(totalDurationSeconds);

    return {
      costs,
      time,
      requests,
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
