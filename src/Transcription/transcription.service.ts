import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { INJECTION_TOKENS } from 'src/common/constants/injection-tokens';
import { RequestRepository } from 'src/database/Repos/requests.repo';
import { TranscribeRepository } from 'src/database/Repos/transcribe.repo';
import { WalletRepository } from 'src/database/Repos/wallet.repo';
import { WalletTransactionRepository } from 'src/database/Repos/walletTransaction.repo';
import {
  ModuleType,
  RequestStatus,
} from 'src/database/entities/requests.entity';
import {
  TranscribeEntity,
  TranscriptionStatus,
} from 'src/database/entities/transcribe.entity';
import {
  TransactionDirection,
  TransactionType,
} from 'src/database/entities/walletTransaction.entity';
import { SpeechToTextService } from './speech-to-text.service';
import { AUDIO_UPLOAD_DIR, TEXT_OUTPUT_DIR } from './transcription.multer';

const TRANSCRIPTION_COST_PER_SECOND = 1000;
const FALLBACK_BYTES_PER_SECOND = 16000;

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);

  constructor(
    @Inject(INJECTION_TOKENS.TRANSCRIBE_REPOSITORY)
    private readonly transcribeRepository: TranscribeRepository,
    @Inject(INJECTION_TOKENS.REQUEST_REPOSITORY)
    private readonly requestRepository: RequestRepository,
    @Inject(INJECTION_TOKENS.WALLET_REPOSITORY)
    private readonly walletRepository: WalletRepository,
    @Inject(INJECTION_TOKENS.WALLET_TRANSACTION_REPOSITORY)
    private readonly walletTransactionRepository: WalletTransactionRepository,
    private readonly speechToTextService: SpeechToTextService,
  ) {
    this.ensureDirectory(AUDIO_UPLOAD_DIR);
    this.ensureDirectory(TEXT_OUTPUT_DIR);
  }

  async uploadAndTranscribe(
    userId: string,
    file: Express.Multer.File | undefined,
  ): Promise<TranscribeEntity> {
    if (!file?.path) {
      throw new BadRequestException('Audio file is required.');
    }

    const duration = this.calculateDuration(file);
    const cost = duration * TRANSCRIPTION_COST_PER_SECOND;
    const wallet = await this.walletRepository.getMainWalletByUserId(userId);

    if (!wallet) {
      throw new NotFoundException('Wallet not found.');
    }

    const currentBalance = Number(wallet.balance);
    if (currentBalance < cost) {
      throw new BadRequestException('Wallet balance is not enough.');
    }

    const request = await this.requestRepository.createRequest({
      userId,
      cost,
      moduleType: ModuleType.TRANSCRIPTION,
      moduleId: null,
      status: RequestStatus.PROCESSING,
      succeedAt: null,
      failedAt: null,
    });

    const transcribe = await this.transcribeRepository.createTranscribe({
      requestId: request.uniqueId,
      inputUrl: this.toRelativeUrl(file.path),
      duration,
      status: TranscriptionStatus.PENDING,
    });

    await this.requestRepository.updateRequest(request.uniqueId, {
      moduleId: transcribe.uniqueId,
      transcribeId: transcribe.uniqueId,
    });

    try {
      const completedTranscribe = await this.processTranscription(
        transcribe.uniqueId,
        file.path,
      );
      const nextBalance = currentBalance - cost;
      const transaction =
        await this.walletTransactionRepository.createTransaction({
          walletId: wallet.uniqueId,
          requestId: request.uniqueId,
          amount: cost,
          balanceAfter: nextBalance,
          type: TransactionType.CONSUME,
          direction: TransactionDirection.DEBIT,
        });

      await this.walletRepository.updateWallet(wallet.uniqueId, {
        balance: nextBalance,
      });

      await this.requestRepository.updateRequest(request.uniqueId, {
        status: RequestStatus.SUCCEED,
        succeedAt: new Date(),
        walletTransactionId: transaction.uniqueId,
      });

      return completedTranscribe;
    } catch (error) {
      await this.requestRepository.updateRequest(request.uniqueId, {
        status: RequestStatus.FAILED,
        failedAt: new Date(),
      });

      throw error;
    }
  }

  async getById(uniqueId: string, userId: string): Promise<TranscribeEntity> {
    const transcribe =
      await this.transcribeRepository.getTranscribeById(uniqueId);

    if (!transcribe) {
      throw new NotFoundException(`Transcription #${uniqueId} not found.`);
    }

    const request = await this.requestRepository.getRequestById(
      transcribe.requestId,
    );

    if (!request || request.userId !== userId) {
      throw new NotFoundException(`Transcription #${uniqueId} not found.`);
    }

    return transcribe;
  }

  getTodayDuration(userId: string): Promise<number> {
    return this.transcribeRepository.getTodayDurationByUserId(userId);
  }

  listByUser(userId: string): Promise<TranscribeEntity[]> {
    return this.transcribeRepository.findByUserId(userId);
  }

  private async processTranscription(
    uniqueId: string,
    audioFilePath: string,
  ): Promise<TranscribeEntity> {
    try {
      await this.transcribeRepository.markProcessing(uniqueId);

      const transcript =
        await this.speechToTextService.transcribeAudioFile(audioFilePath);
      const outputUrl = this.saveTextFile(transcript, uniqueId);

      await this.transcribeRepository.markCompleted(uniqueId, outputUrl);

      const transcribe =
        await this.transcribeRepository.getTranscribeById(uniqueId);

      if (!transcribe) {
        throw new NotFoundException(`Transcription #${uniqueId} not found.`);
      }

      this.logger.log(
        `Transcription #${uniqueId} completed. Text: ${outputUrl}`,
      );

      return transcribe;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown transcription error';

      this.logger.error(`Transcription #${uniqueId} failed: ${message}`);
      await this.transcribeRepository.markFailed(uniqueId, message);

      throw error;
    }
  }

  private calculateDuration(file: Express.Multer.File): number {
    try {
      const output = execFileSync(
        'ffprobe',
        [
          '-v',
          'error',
          '-show_entries',
          'format=duration',
          '-of',
          'default=noprint_wrappers=1:nokey=1',
          file.path,
        ],
        { encoding: 'utf-8' },
      );
      const duration = Math.ceil(Number(output.trim()));

      if (Number.isFinite(duration) && duration > 0) {
        return duration;
      }
    } catch {
      this.logger.warn(
        'Could not read audio duration with ffprobe; using size estimate.',
      );
    }

    const size = file.size || statSync(file.path).size;
    return Math.max(1, Math.ceil(size / FALLBACK_BYTES_PER_SECOND));
  }

  private saveTextFile(content: string, transcribeId: string): string {
    this.ensureDirectory(TEXT_OUTPUT_DIR);

    const date = new Date().toISOString().slice(0, 10);
    const filename = `${date}_${uuidv4()}_${transcribeId}.txt`;
    const fullPath = join(TEXT_OUTPUT_DIR, filename);

    writeFileSync(fullPath, content, 'utf-8');

    return this.toRelativeUrl(fullPath);
  }

  private toRelativeUrl(absolutePath: string): string {
    return relative(process.cwd(), absolutePath).replace(/\\/g, '/');
  }

  private ensureDirectory(directory: string): void {
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }
  }
}
