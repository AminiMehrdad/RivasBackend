import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { execFileSync } from 'child_process';
import { SpeechToTextService } from './speech-to-text.service';
import {
  AUDIO_UPLOAD_DIR,
  TEXT_OUTPUT_DIR,
} from './transcription.multer';
import { INJECTION_TOKENS } from 'src/common/constants/injection-tokens';
import { TranscribeRepository } from 'src/database/Repos/transcribe.repo';
import { RequestRepository } from 'src/database/Repos/requests.repo';
import { WalletRepository } from 'src/database/Repos/wallet.repo';
import { WalletTransactionRepository } from 'src/database/Repos/walletTransaction.repo';
import { RequestStatus } from 'src/database/entities/requests.entity';
import { TranscribeEntity, TranscriptionStatus } from 'src/database/entities/transcribe.entity';
import { TransactionDirection, TransactionType } from 'src/database/entities/walletTransaction.entity';

const TRANSCRIPTION_MODULE_TYPE = 'transcription';
const TRANSCRIPTION_COST_PER_SECOND = 1000;

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);

  constructor(
    @Inject(INJECTION_TOKENS.TRANSCRIBE_REPOSITORY)
    private readonly transcriptionRepo: TranscribeRepository,
    @Inject(INJECTION_TOKENS.REQUEST_REPOSITORY)
    private readonly requestRepo: RequestRepository,
    @Inject(INJECTION_TOKENS.WALLET_REPOSITORY)
    private readonly walletRepo: WalletRepository,
    @Inject(INJECTION_TOKENS.WALLET_TRANSACTION_REPOSITORY)
    private readonly walletTransactionRepo: WalletTransactionRepository,

    private readonly sttService: SpeechToTextService,
  ) {
    this.ensureDir(AUDIO_UPLOAD_DIR);
    this.ensureDir(TEXT_OUTPUT_DIR);
  }

  async uploadAndTranscribe(
    userId: string,
    file: Express.Multer.File,
  ): Promise<TranscribeEntity> {
    if (!file) {
      throw new BadRequestException('Audio file is required.');
    }

    const inputUrl = this.toRelativeUrl(file.path);
    const duration = this.calculateDuration(file);
    const cost = duration * TRANSCRIPTION_COST_PER_SECOND;
    const wallet = await this.walletRepo.getMainWalletByUserId(userId);

    if (!wallet) {
      throw new NotFoundException('Wallet not found.');
    }

    const currentBalance = Number(wallet.balance);
    if (currentBalance < cost) {
      throw new BadRequestException('Wallet balance is not enough.');
    }

    const request = await this.requestRepo.createRequest({
      userId,
      cost,
      moduleType: TRANSCRIPTION_MODULE_TYPE,
      moduleId: 0,
      status: RequestStatus.PROCESSING,
      succeedAt: null,
      failedAt: null,
    });

    const record = await this.transcriptionRepo.createTranscribe({
      requestId: request.uniqueId,
      inputUrl,
      duration,
      status: TranscriptionStatus.PENDING,
    });

    await this.requestRepo.updateRequest(request.uniqueId, {
      moduleId: record.id,
      transcribeId: record.uniqueId,
    });

    try {
      const completedRecord = await this.processTranscription(record.uniqueId, file.path);
      const nextBalance = currentBalance - cost;
      const transaction = await this.walletTransactionRepo.createTransaction({
        walletId: wallet.uniqueId,
        requestId: request.uniqueId,
        amount: cost,
        balanceAfter: nextBalance,
        type: TransactionType.CONSUME,
        direction: TransactionDirection.DEBIT,
      });

      await this.walletRepo.updateWallet(wallet.uniqueId, {
        balance: nextBalance,
      });

      await this.requestRepo.updateRequest(request.uniqueId, {
        status: RequestStatus.SUCCEED,
        succeedAt: new Date(),
        walletTranscriptionId: transaction.uniqueId,
      });

      return completedRecord;
    } catch (err) {
      await this.requestRepo.updateRequest(request.uniqueId, {
        status: RequestStatus.FAILED,
        failedAt: new Date(),
      });

      throw err;
    }
  }

  /** Retrieve a single transcription by id (scoped to the requesting user). */
  async getById(
    uniqueId: string,
    userId: string,
  ): Promise<TranscribeEntity> {
    const record = await this.transcriptionRepo.getTranscribeById(uniqueId);
    if (!record) {
      throw new NotFoundException(`Transcription #${uniqueId} not found.`);
    }

    const request = await this.requestRepo.getRequestById(record.requestId);
    if (!request || request.userId !== userId) {
      throw new NotFoundException(`Transcription #${uniqueId} not found.`);
    }

    return record;
  }

  async getTodayDuration(requestId: string): Promise<number> {
    return this.transcriptionRepo.getTodayDurationByUserId(requestId);
  }

  /** Retrieve a list of all transcriptions for a user, newest first. */
  listByUser(userId: string): Promise<TranscribeEntity[]> {
    return this.transcriptionRepo.findbyUserId(userId);
  }

  // ─── Internal ──────────────────────────────────────────────────────────────
  private async processTranscription(
    uniqueId: string,
    audioFilePath: string,
  ): Promise<TranscribeEntity> {
    try {
      await this.transcriptionRepo.markProcessing(uniqueId);

      const transcript = await this.sttService.transcribeAudioFile(audioFilePath);

      const outputUrl = this.saveTextFile(transcript, uniqueId);

      await this.transcriptionRepo.markCompleted(uniqueId, outputUrl);

      this.logger.log(`Transcription #${uniqueId} completed. Text: ${outputUrl}`);
      const record = await this.transcriptionRepo.getTranscribeById(uniqueId);
      if (!record) {
        throw new NotFoundException(`Transcription #${uniqueId} not found.`);
      }

      return record;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown transcription error';
      this.logger.error(
        `Transcription #${uniqueId} failed: ${message}`,
      );
      await this.transcriptionRepo.markFailed(uniqueId, message);
      throw err;
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
      this.logger.warn('Could not read audio duration with ffprobe; using size estimate.');
    }

    const size = file.size || statSync(file.path).size;
    return Math.max(1, Math.ceil(size / 16000));
  }

  private saveTextFile(content: string, recordId: string): string {
    const filename = `${new Date().toISOString().slice(0, 10)}_${uuidv4()}_${recordId}.txt`;
    const fullPath = join(TEXT_OUTPUT_DIR, filename);
    writeFileSync(fullPath, content, 'utf-8');
    return this.toRelativeUrl(fullPath);
  }


  private toRelativeUrl(absolutePath: string): string {
    return relative(process.cwd(), absolutePath).replace(/\\/g, '/');
  }

  private ensureDir(dir: string): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}
