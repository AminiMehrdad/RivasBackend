import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
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
import { WalletType } from 'src/database/entities/wallet.entity';
import {
  TransactionDirection,
  TransactionType,
} from 'src/database/entities/walletTransaction.entity';
import { SpeechToTextService } from './speech-to-text.service';
import { TranscriptionService } from './transcription.service';

const makeFile = (): Express.Multer.File =>
  ({
    path: 'uploads/audio/test.mp3',
    originalname: 'test.mp3',
    mimetype: 'audio/mpeg',
    size: 32000,
  }) as Express.Multer.File;

const makeTranscribe = (
  overrides: Partial<TranscribeEntity> = {},
): TranscribeEntity =>
  ({
    id: 1,
    uniqueId: 'transcribe-1',
    inputUrl: 'uploads/audio/test.mp3',
    outputUrl: null,
    duration: 2,
    status: TranscriptionStatus.PENDING,
    requestId: 'request-1',
    errorMessage: null,
    createdAt: new Date('2026-06-13T00:00:00.000Z'),
    ...overrides,
  }) as TranscribeEntity;

describe('TranscriptionService', () => {
  let service: TranscriptionService;
  let transcribeRepository: jest.Mocked<TranscribeRepository>;
  let requestRepository: jest.Mocked<RequestRepository>;
  let walletRepository: jest.Mocked<WalletRepository>;
  let walletTransactionRepository: jest.Mocked<WalletTransactionRepository>;
  let speechToTextService: jest.Mocked<SpeechToTextService>;

  beforeEach(async () => {
    transcribeRepository = {
      createTranscribe: jest.fn(),
      getTranscribeById: jest.fn(),
      getTodayDurationByUserId: jest.fn(),
      getAllTranscribes: jest.fn(),
      updateTranscribe: jest.fn(),
      deleteTranscribe: jest.fn(),
      markProcessing: jest.fn(),
      markCompleted: jest.fn(),
      markFailed: jest.fn(),
      findByUserId: jest.fn(),
    };

    requestRepository = {
      createRequest: jest.fn(),
      getRequestById: jest.fn(),
      getRequestsByUserId: jest.fn(),
      getTodayCostByUserId: jest.fn(),
      getTodayRequestsCountByUserId: jest.fn(),
      getAllRequests: jest.fn(),
      updateRequest: jest.fn(),
      deleteRequest: jest.fn(),
    };

    walletRepository = {
      createWallet: jest.fn(),
      getWalletByUserId: jest.fn(),
      getMainWalletByUserId: jest.fn(),
      getWalletById: jest.fn(),
      getAllWallets: jest.fn(),
      updateWallet: jest.fn(),
      deleteWallet: jest.fn(),
    };

    walletTransactionRepository = {
      createTransaction: jest.fn(),
      getTransactionsByWalletId: jest.fn(),
      getTransactionById: jest.fn(),
      getTransactionsByUserId: jest.fn(),
      getAllTransactions: jest.fn(),
      updateTransaction: jest.fn(),
      deleteTransaction: jest.fn(),
    };

    speechToTextService = {
      transcribeAudioFile: jest.fn(),
    } as unknown as jest.Mocked<SpeechToTextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranscriptionService,
        {
          provide: INJECTION_TOKENS.TRANSCRIBE_REPOSITORY,
          useValue: transcribeRepository,
        },
        {
          provide: INJECTION_TOKENS.REQUEST_REPOSITORY,
          useValue: requestRepository,
        },
        {
          provide: INJECTION_TOKENS.WALLET_REPOSITORY,
          useValue: walletRepository,
        },
        {
          provide: INJECTION_TOKENS.WALLET_TRANSACTION_REPOSITORY,
          useValue: walletTransactionRepository,
        },
        { provide: SpeechToTextService, useValue: speechToTextService },
      ],
    }).compile();

    service = module.get<TranscriptionService>(TranscriptionService);
  });

  it('creates request, transcribe, wallet transaction and completes successfully', async () => {
    const transcribe = makeTranscribe();
    const completed = makeTranscribe({
      status: TranscriptionStatus.COMPLETED,
      outputUrl: 'uploads/text/result.txt',
    });

    walletRepository.getMainWalletByUserId.mockResolvedValue({
      uniqueId: 'wallet-1',
      userId: 'user-1',
      type: WalletType.MAIN,
      balance: 5000,
    } as never);
    requestRepository.createRequest.mockResolvedValue({
      uniqueId: 'request-1',
      userId: 'user-1',
    } as never);
    transcribeRepository.createTranscribe.mockResolvedValue(transcribe);
    speechToTextService.transcribeAudioFile.mockResolvedValue('hello world');
    transcribeRepository.getTranscribeById.mockResolvedValue(completed);
    walletTransactionRepository.createTransaction.mockResolvedValue({
      uniqueId: 'tx-1',
    } as never);

    const result = await service.uploadAndTranscribe('user-1', makeFile());

    expect(requestRepository.createRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        cost: 2000,
        moduleType: ModuleType.TRANSCRIPTION,
        status: RequestStatus.PROCESSING,
      }),
    );
    expect(transcribeRepository.markProcessing).toHaveBeenCalledWith(
      'transcribe-1',
    );
    expect(walletTransactionRepository.createTransaction).toHaveBeenCalledWith({
      walletId: 'wallet-1',
      requestId: 'request-1',
      amount: 2000,
      balanceAfter: 3000,
      type: TransactionType.CONSUME,
      direction: TransactionDirection.DEBIT,
    });
    expect(result).toBe(completed);
  });

  it('throws when no audio file is provided', async () => {
    await expect(
      service.uploadAndTranscribe('user-1', undefined),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when wallet is missing', async () => {
    walletRepository.getMainWalletByUserId.mockResolvedValue(null);

    await expect(
      service.uploadAndTranscribe('user-1', makeFile()),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws when wallet balance is not enough', async () => {
    walletRepository.getMainWalletByUserId.mockResolvedValue({
      uniqueId: 'wallet-1',
      userId: 'user-1',
      type: WalletType.MAIN,
      balance: 1000,
    } as never);

    await expect(
      service.uploadAndTranscribe('user-1', makeFile()),
    ).rejects.toThrow(BadRequestException);
  });

  it('marks request failed when speech-to-text fails', async () => {
    const transcribe = makeTranscribe();

    walletRepository.getMainWalletByUserId.mockResolvedValue({
      uniqueId: 'wallet-1',
      userId: 'user-1',
      type: WalletType.MAIN,
      balance: 5000,
    } as never);
    requestRepository.createRequest.mockResolvedValue({
      uniqueId: 'request-1',
      userId: 'user-1',
    } as never);
    transcribeRepository.createTranscribe.mockResolvedValue(transcribe);
    speechToTextService.transcribeAudioFile.mockRejectedValue(
      new Error('provider unavailable'),
    );

    await expect(
      service.uploadAndTranscribe('user-1', makeFile()),
    ).rejects.toThrow('provider unavailable');

    expect(transcribeRepository.markFailed).toHaveBeenCalledWith(
      'transcribe-1',
      'provider unavailable',
    );
    expect(requestRepository.updateRequest).toHaveBeenCalledWith('request-1', {
      status: RequestStatus.FAILED,
      failedAt: expect.any(Date),
    });
  });

  it('scopes getById to the requesting user', async () => {
    const transcribe = makeTranscribe();

    transcribeRepository.getTranscribeById.mockResolvedValue(transcribe);
    requestRepository.getRequestById.mockResolvedValue({
      uniqueId: 'request-1',
      userId: 'user-1',
    } as never);

    await expect(service.getById('transcribe-1', 'user-2')).rejects.toThrow(
      NotFoundException,
    );
  });
});
