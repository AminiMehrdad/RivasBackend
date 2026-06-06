import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { AUTH_CONSTANTS } from '../common/constants/auth.constants';
import { INJECTION_TOKENS } from '../common/constants/injection-tokens';
import { InvalidOtpError, InvalidRefreshTokenError, UnauthorizedError } from '../common/errors/auth.errors';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { createOpaqueToken, sha256 } from '../common/utils/token.util';
import { EnvConfig } from '../config/env.schema';
import { UserEntity } from '../database/entities/user.entity';
import { AuthResponseDto, OtpResponseDto, RequestOtpDto, VerifyOtpDto } from './auth.dto';
import { SmsService } from './sms.service';
import { AuthRepository } from './auth.repository';

interface RefreshSession {
  userId: string;
  tokenHash: string;
}

interface OtpSession {
  phoneNumber: string;
  codeHash: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(INJECTION_TOKENS.USER_REPOSITORY)
    private readonly userRepository: AuthRepository,
    @Inject(INJECTION_TOKENS.REDIS_CLIENT)
    private readonly redisClient: Redis,
    @Inject(INJECTION_TOKENS.SMS_SERVICE)
    private readonly smsService: SmsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) { }

  async requestOtp(dto: RequestOtpDto): Promise<OtpResponseDto> {
    const phoneNumber = this.normalizePhoneNumber(dto.phoneNumber);
    const code = this.createOtpCode();

    await this.redisClient.set(
      this.getOtpSessionKey(phoneNumber),
      JSON.stringify({
        phoneNumber,
        codeHash: sha256(code),
      } satisfies OtpSession),
      'EX',
      AUTH_CONSTANTS.OTP_TTL_SECONDS,
    );

    // await this.smsService.sendVerificationCode(phoneNumber, code);
    await this.smsService.dummyRequst(phoneNumber, code)

    return {
      success: true,
      message: 'Verification code sent.',
    };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthResponseDto> {
    const phoneNumber = this.normalizePhoneNumber(dto.phoneNumber);
    const sessionKey = this.getOtpSessionKey(phoneNumber);
    const rawSession = await this.redisClient.get(sessionKey);


    if (!rawSession) {
      throw new InvalidOtpError();
    }

    const session = this.parseOtpSession(rawSession);
    if (session.codeHash !== sha256(dto.code)) {
      throw new InvalidOtpError();
    }

    await this.redisClient.del(sessionKey);

    let user = await this.userRepository.findByPhoneNumber(phoneNumber)

    if (!user) {
      user = await this.userRepository.createUser({
        phoneNumber
      })

      await this.userRepository.createWallet(user.uniqueId)

    }

    return {
      user: this.toUserResponse(user),
      tokens: await this.issueTokens(user),
    };
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) {
      throw new InvalidRefreshTokenError();
    }

    const sessionKey = this.getRefreshSessionKey(refreshToken);
    const rawSession = await this.redisClient.get(sessionKey);
    if (!rawSession) {
      throw new InvalidRefreshTokenError();
    }

    const session = this.parseRefreshSession(rawSession);
    if (session.tokenHash !== sha256(refreshToken)) {
      throw new InvalidRefreshTokenError();
    }

    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      await this.redisClient.del(sessionKey);
      throw new InvalidRefreshTokenError();
    }

    await this.redisClient.del(sessionKey);

    const tokens = await this.issueTokens(user);

    await this.userRepository.update(session.userId, { lastSeenAt: new Date() });

    return {
      tokens,
      userId: user.uniqueId,
      role: user.role
    };
  }

  async logout(accessToken: string | undefined, refreshToken: string| undefined): Promise<void> {
    await this.redisClient.set(
      `${AUTH_CONSTANTS.BLACKLIST_PREFIX}${accessToken}`,
      '1',
      'EX',
      this.configService.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true }),
    );
    if (refreshToken) {
      await this.redisClient.del(this.getRefreshSessionKey(refreshToken));
    }
  }

  private async issueTokens(user: UserEntity) {
    const payload: RequestUser = {
      userId: user.uniqueId,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = createOpaqueToken();
    const ttlSeconds = this.configService.get('REFRESH_TOKEN_TTL_SECONDS', { infer: true });

    await this.redisClient.set(
      this.getRefreshSessionKey(refreshToken),
      JSON.stringify({
        userId: user.uniqueId,
        tokenHash: sha256(refreshToken),
      } satisfies RefreshSession),
      'EX',
      ttlSeconds,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true }),
    };
  }

  async checkAcessToken(acessToken: string) {
    return await this.jwtService.verifyAsync<RequestUser>(acessToken);
  }

  private parseRefreshSession(rawSession: string): RefreshSession {
    try {
      const parsed = JSON.parse(rawSession) as Partial<RefreshSession>;
      if (!parsed.userId || !parsed.tokenHash) {
        throw new InvalidRefreshTokenError();
      }

      return {
        userId: parsed.userId,
        tokenHash: parsed.tokenHash,
      };
    } catch {
      throw new InvalidRefreshTokenError();
    }
  }

  private parseOtpSession(rawSession: string): OtpSession {
    try {
      const parsed = JSON.parse(rawSession) as Partial<OtpSession>;
      if (!parsed.phoneNumber || !parsed.codeHash) {
        throw new InvalidOtpError();
      }

      return {
        phoneNumber: parsed.phoneNumber,
        codeHash: parsed.codeHash,
      };
    } catch {
      throw new InvalidOtpError();
    }
  }

  private getRefreshSessionKey(refreshToken: string): string {
    return `${AUTH_CONSTANTS.REFRESH_TOKEN_PREFIX}${sha256(refreshToken)}`;
  }

  private getOtpSessionKey(phoneNumber: string): string {
    return `${AUTH_CONSTANTS.OTP_PREFIX}${sha256(phoneNumber)}`;
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    return phoneNumber.trim().replace(/\s+/g, '');
  }

  private createOtpCode(): string {
    return Math.floor(Math.random() * 10 ** AUTH_CONSTANTS.OTP_LENGTH)
      .toString()
      .padStart(AUTH_CONSTANTS.OTP_LENGTH, '0');
  }

  private toUserResponse(user: UserEntity) {
    return {
      id: user.uniqueId,
      phoneNumber: user.phoneNumber,
      role: user.role,
    };
  }
}
