import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import {
  InvalidOtpError,
  InvalidRefreshTokenError,
} from '../../src/common/errors/auth.errors';
import { sha256 } from '../../src/common/utils/token.util';
import { UserRole, UserEntity } from '../../src/database/entities/user.entity';
import { AuthService } from '../../src/auth/auth.service';
import { AuthRepository } from '../../src/auth/auth.repository';
import { SmsService } from '../../src/auth/sms.service';

const createUser = (overrides: Partial<UserEntity> = {}): UserEntity =>
  ({
    id: 'user-1',
    uniqueId: 'user-unique-1',
    phoneNumber: '+989121234567',
    role: UserRole.USER,
    lastSeenAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as UserEntity;

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: jest.Mocked<AuthRepository>;
  let redisClient: Pick<jest.Mocked<Redis>, 'get' | 'set' | 'del'>;
  let smsService: jest.Mocked<SmsService>;
  let jwtService: Pick<jest.Mocked<JwtService>, 'signAsync'>;
  let configService: {
    get: jest.Mock<number | undefined, [string, ...unknown[]]>;
  };

  beforeEach(() => {
    authRepository = {
      findByPhoneNumber: jest.fn(),
      findById: jest.fn(),
      createUser: jest.fn(),
      update: jest.fn(),
      createWallet: jest.fn(),
    };
    redisClient = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };
    smsService = {
      sendVerificationCode: jest.fn().mockResolvedValue(undefined),
      dummyRequst: jest.fn().mockResolvedValue(undefined),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('access-token'),
    };
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, number> = {
          ACCESS_TOKEN_TTL_SECONDS: 900,
          REFRESH_TOKEN_TTL_SECONDS: 604800,
        };
        return values[key];
      }),
    };

    service = new AuthService(
      authRepository,
      redisClient as unknown as Redis,
      smsService,
      jwtService as unknown as JwtService,
      configService as never,
    );
  });

  describe('requestOtp', () => {
    it('stores a hashed verification code and sends it by SMS', async () => {
      const result = await service.requestOtp({
        phoneNumber: '+989121234567',
      });

      expect(result).toEqual({
        success: true,
        message: 'Verification code sent.',
      });
      expect(redisClient.set).toHaveBeenCalledWith(
        expect.stringContaining('auth:otp:'),
        expect.stringContaining('"phoneNumber":"+989121234567"'),
        'EX',
        120,
      );
      expect(smsService.dummyRequst.mock.calls).toHaveLength(1);
      expect(smsService.dummyRequst.mock.calls[0]?.[0]).toBe('+989121234567');
      expect(smsService.dummyRequst.mock.calls[0]?.[1]).toMatch(/^\d{6}$/);
      expect(smsService.sendVerificationCode.mock.calls).toHaveLength(0);
    });
  });

  describe('verifyOtp', () => {
    it('throws when code session is missing', async () => {
      redisClient.get.mockResolvedValue(null);

      await expect(
        service.verifyOtp({ phoneNumber: '+989121234567', code: '123456' }),
      ).rejects.toBeInstanceOf(InvalidOtpError);
    });

    it('throws when code is invalid', async () => {
      redisClient.get.mockResolvedValue(
        JSON.stringify({
          phoneNumber: '+989121234567',
          codeHash: sha256('654321'),
        }),
      );

      await expect(
        service.verifyOtp({ phoneNumber: '+989121234567', code: '123456' }),
      ).rejects.toBeInstanceOf(InvalidOtpError);
    });

    it('creates user and issues tokens when code is valid', async () => {
      const user = createUser();
      redisClient.get.mockResolvedValue(
        JSON.stringify({
          phoneNumber: user.phoneNumber,
          codeHash: sha256('123456'),
        }),
      );
      authRepository.findByPhoneNumber.mockResolvedValue(null);
      authRepository.createUser.mockResolvedValue(user);

      const result = await service.verifyOtp({
        phoneNumber: user.phoneNumber,
        code: '123456',
      });

      expect(authRepository.createUser.mock.calls).toContainEqual([
        {
          phoneNumber: user.phoneNumber,
        },
      ]);
      expect(authRepository.createWallet.mock.calls).toContainEqual([
        user.uniqueId,
      ]);
      expect(result.user).toEqual({
        id: user.uniqueId,
        phoneNumber: user.phoneNumber,
        role: user.role,
      });
      expect(result.tokens.accessToken).toBe('access-token');
    });

    it('logs in existing user when phone number already exists', async () => {
      const user = createUser();
      redisClient.get.mockResolvedValue(
        JSON.stringify({
          phoneNumber: user.phoneNumber,
          codeHash: sha256('123456'),
        }),
      );
      authRepository.findByPhoneNumber.mockResolvedValue(user);

      const result = await service.verifyOtp({
        phoneNumber: user.phoneNumber,
        code: '123456',
      });

      expect(authRepository.createUser.mock.calls).toHaveLength(0);
      expect(result.user.phoneNumber).toBe(user.phoneNumber);
    });
  });

  describe('refresh', () => {
    it('throws when token is expired', async () => {
      redisClient.get.mockResolvedValue(null);

      await expect(service.refresh('expired-token')).rejects.toBeInstanceOf(
        InvalidRefreshTokenError,
      );
    });

    it('throws when token payload hash is invalid', async () => {
      redisClient.get.mockResolvedValue(
        JSON.stringify({
          userId: 'user-1',
          tokenHash: sha256('different-token'),
        }),
      );

      await expect(service.refresh('refresh-token')).rejects.toBeInstanceOf(
        InvalidRefreshTokenError,
      );
    });

    it('rotates refresh token and returns new tokens', async () => {
      const user = createUser();
      redisClient.get.mockResolvedValue(
        JSON.stringify({
          userId: user.uniqueId,
          tokenHash: sha256('refresh-token'),
        }),
      );
      authRepository.findById.mockResolvedValue(user);

      const result = await service.refresh('refresh-token');

      expect(redisClient.del).toHaveBeenCalledWith(
        `auth:refresh:${sha256('refresh-token')}`,
      );
      const updateCall = authRepository.update.mock.calls[0];
      expect(updateCall?.[0]).toBe(user.uniqueId);
      expect(updateCall?.[1]?.lastSeenAt).toBeInstanceOf(Date);
      expect(result.tokens.accessToken).toBe('access-token');
      expect(result.tokens.refreshToken).not.toBe('refresh-token');
      expect(result.userId).toBe(user.uniqueId);
      expect(result.role).toBe(user.role);
    });
  });
});
