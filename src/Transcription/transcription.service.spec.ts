import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TranscriptionRepository } from '../../../src/database/Repos/transcription.repo';
import {
  TranscriptionEntity,
  TranscriptionStatus,
} from '../../../src/database/entities/transcription.entity';
import { SpeechToTextService } from '../../../src/transcription/speech-to-text.service';
import { TranscriptionService } from '../../../src/transcription/transcription.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeRecord = (overrides: Partial<TranscriptionEntity> = {}): TranscriptionEntity =>
  Object.assign(new TranscriptionEntity(), {
    id: 1,
    userId: 'user-abc',
    audioUrl: 'uploads/audio/2024-06-08_uuid.mp3',
    textUrl: null,
    status: TranscriptionStatus.PENDING,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TranscriptionService', () => {
  let service: TranscriptionService;

  let repoMock: jest.Mocked<TranscriptionRepository>;
  let sttMock: jest.Mocked<SpeechToTextService>;

  beforeEach(async () => {
    repoMock = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUser: jest.fn(),
      markProcessing: jest.fn(),
      markCompleted: jest.fn(),
      markFailed: jest.fn(),
    } as unknown as jest.Mocked<TranscriptionRepository>;

    sttMock = {
      transcribeAudioFile: jest.fn(),
    } as unknown as jest.Mocked<SpeechToTextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranscriptionService,
        { provide: TranscriptionRepository, useValue: repoMock },
        { provide: SpeechToTextService, useValue: sttMock },
      ],
    }).compile();

    service = module.get<TranscriptionService>(TranscriptionService);
  });

  // ─── uploadAndTranscribe ──────────────────────────────────────────────────

  describe('uploadAndTranscribe', () => {
    it('creates a DB record and returns it immediately with PENDING status', async () => {
      const record = makeRecord();
      repoMock.create.mockResolvedValue(record);
      sttMock.transcribeAudioFile.mockResolvedValue('transcript text');
      repoMock.markProcessing.mockResolvedValue(undefined);
      repoMock.markCompleted.mockResolvedValue(undefined);

      const file = {
        path: '/app/uploads/audio/2024-06-08_uuid.mp3',
        originalname: 'test.mp3',
        mimetype: 'audio/mpeg',
      } as Express.Multer.File;

      const result = await service.uploadAndTranscribe('user-abc', file);

      expect(repoMock.create).toHaveBeenCalledWith({
        userId: 'user-abc',
        audioUrl: expect.stringContaining('uploads/audio'),
      });
      expect(result.status).toBe(TranscriptionStatus.PENDING);
    });

    it('fires background processing without blocking the response', async () => {
      const record = makeRecord();
      repoMock.create.mockResolvedValue(record);

      // STT takes a long time — should not block uploadAndTranscribe
      let sttResolved = false;
      sttMock.transcribeAudioFile.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => {
              sttResolved = true;
              resolve('text');
            }, 200),
          ),
      );
      repoMock.markProcessing.mockResolvedValue(undefined);
      repoMock.markCompleted.mockResolvedValue(undefined);

      const file = { path: '/app/uploads/audio/file.mp3' } as Express.Multer.File;
      await service.uploadAndTranscribe('user-abc', file);

      // STT should NOT have resolved yet
      expect(sttResolved).toBe(false);
    });
  });

  // ─── getById ──────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns the record when it belongs to the user', async () => {
      const record = makeRecord();
      repoMock.findById.mockResolvedValue(record);

      const result = await service.getById(1, 'user-abc');
      expect(result).toBe(record);
    });

    it('throws NotFoundException when record does not exist', async () => {
      repoMock.findById.mockResolvedValue(null);
      await expect(service.getById(99, 'user-abc')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when record belongs to a different user', async () => {
      const record = makeRecord({ userId: 'other-user' });
      repoMock.findById.mockResolvedValue(record);
      await expect(service.getById(1, 'user-abc')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── listByUser ───────────────────────────────────────────────────────────

  describe('listByUser', () => {
    it('delegates to the repository', async () => {
      const records = [makeRecord(), makeRecord({ id: 2 })];
      repoMock.findByUser.mockResolvedValue(records);

      const result = await service.listByUser('user-abc');
      expect(repoMock.findByUser).toHaveBeenCalledWith('user-abc');
      expect(result).toHaveLength(2);
    });
  });

  // ─── background processing ────────────────────────────────────────────────

  describe('background processing (via uploadAndTranscribe)', () => {
    it('marks the record as completed when STT succeeds', async () => {
      const record = makeRecord();
      repoMock.create.mockResolvedValue(record);
      repoMock.markProcessing.mockResolvedValue(undefined);
      repoMock.markCompleted.mockResolvedValue(undefined);
      sttMock.transcribeAudioFile.mockResolvedValue('Hello world');

      const file = { path: '/app/uploads/audio/file.mp3' } as Express.Multer.File;
      await service.uploadAndTranscribe('user-abc', file);

      // Let the microtask queue drain
      await new Promise((r) => setTimeout(r, 50));

      expect(repoMock.markProcessing).toHaveBeenCalledWith(record.id);
      expect(repoMock.markCompleted).toHaveBeenCalledWith(
        record.id,
        expect.stringContaining('uploads/text'),
      );
    });

    it('marks the record as failed when STT throws', async () => {
      const record = makeRecord();
      repoMock.create.mockResolvedValue(record);
      repoMock.markProcessing.mockResolvedValue(undefined);
      repoMock.markFailed.mockResolvedValue(undefined);
      sttMock.transcribeAudioFile.mockRejectedValue(
        new Error('STT provider unavailable'),
      );

      const file = { path: '/app/uploads/audio/file.mp3' } as Express.Multer.File;
      await service.uploadAndTranscribe('user-abc', file);

      await new Promise((r) => setTimeout(r, 50));

      expect(repoMock.markFailed).toHaveBeenCalledWith(
        record.id,
        'STT provider unavailable',
      );
    });
  });
});
