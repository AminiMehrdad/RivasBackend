import { INestApplication, NestMiddleware } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import Redis from 'ioredis';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { TypeOrmUserRepository, UserRepository } from '../../src/auth/auth.repository';
import { SmsService } from '../../src/auth/sms.service';
import { AuthTokenMiddleware } from '../../src/common/middleware/auth-token.middleware';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { AppValidationPipe } from '../../src/common/pipes/validation.pipe';
import { INJECTION_TOKENS } from '../../src/common/constants/injection-tokens';
import { UserEntity, UserRole } from '../../src/database/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, UserEntity>();

  async findByPhoneNumber(phoneNumber: string): Promise<UserEntity | null> {
    return [...this.users.values()].find((user) => user.phoneNumber === phoneNumber) ?? null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.users.get(id) ?? null;
  }

  async createUser(input: { phoneNumber: string }): Promise<UserEntity> {
    const user = {
      id: `user-${this.users.size + 1}`,
      phoneNumber: input.phoneNumber,
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as UserEntity;
    this.users.set(user.id, user);
    return user;
  }
}

class InMemoryRedis {
  private readonly values = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<'OK'> {
    this.values.set(key, value);
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const deleted = this.values.delete(key);
    return deleted ? 1 : 0;
  }

  async exists(key: string): Promise<number> {
    return this.values.has(key) ? 1 : 0;
  }
}

class TestAuthTokenMiddleware implements NestMiddleware {
  constructor(private readonly middleware: AuthTokenMiddleware) {}

  use(req: Request, res: Response, next: NextFunction): void {
    void this.middleware.use(req, res, next);
  }
}

describe('Auth flow (e2e)', () => {
  let app: INestApplication;
  let smsService: jest.Mocked<SmsService>;

  beforeEach(async () => {
    const redisClient = new InMemoryRedis();
    smsService = {
      sendVerificationCode: jest.fn().mockResolvedValue(undefined),
    };
    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string | number | boolean> = {
          JWT_ACCESS_SECRET: 'test-access-secret-at-least-32-chars',
          JWT_ACCESS_EXPIRES_IN: '15m',
          ACCESS_TOKEN_TTL_SECONDS: 900,
          REFRESH_TOKEN_TTL_SECONDS: 604800,
          COOKIE_SECURE: false,
          COOKIE_SAME_SITE: 'lax',
          COOKIE_DOMAIN: '',
        };
        return values[key];
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-access-secret-at-least-32-chars',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        AuthTokenMiddleware,
        { provide: ConfigService, useValue: configService },
        { provide: INJECTION_TOKENS.USER_REPOSITORY, useClass: InMemoryUserRepository },
        { provide: INJECTION_TOKENS.REDIS_CLIENT, useValue: redisClient },
        { provide: INJECTION_TOKENS.SMS_SERVICE, useValue: smsService },
      ],
    })
      .overrideProvider(TypeOrmUserRepository)
      .useClass(InMemoryUserRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new AppValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    const authTokenMiddleware = new TestAuthTokenMiddleware(
      new AuthTokenMiddleware(app.get(JwtService), redisClient as unknown as Redis),
    );
    app.use(authTokenMiddleware.use.bind(authTokenMiddleware));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('requests code, verifies code, refreshes, and logs out', async () => {
    await request(app.getHttpServer())
      .post('/auth/request-code')
      .send({
        phoneNumber: '+989121234567',
      })
      .expect(200)
      .expect({ success: true, message: 'Verification code sent.' });

    const [phoneNumber, code] = smsService.sendVerificationCode.mock.calls[0] ?? [];
    expect(phoneNumber).toBe('+989121234567');
    expect(code).toEqual(expect.stringMatching(/^\d{6}$/));

    const verifyResponse = await request(app.getHttpServer())
      .post('/auth/verify-code')
      .send({ phoneNumber: '+989121234567', code })
      .expect(201);

    expect(verifyResponse.body.user).toMatchObject({
      phoneNumber: '+989121234567',
    });
    expect(verifyResponse.body.tokens.accessToken).toEqual(expect.any(String));

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: verifyResponse.body.tokens.refreshToken })
      .expect(200);

    expect(refreshResponse.body.tokens.refreshToken).not.toBe(verifyResponse.body.tokens.refreshToken);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${refreshResponse.body.tokens.accessToken}`)
      .send({ refreshToken: refreshResponse.body.tokens.refreshToken })
      .expect(200)
      .expect({ success: true });
  });

  it('rejects invalid verification code', async () => {
    await request(app.getHttpServer())
      .post('/auth/request-code')
      .send({
        phoneNumber: '+989121234567',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/verify-code')
      .send({ phoneNumber: '+989121234567', code: '000000' })
      .expect(401);
  });

  it('rejects invalid phone payload', async () => {
    await request(app.getHttpServer())
      .post('/auth/request-code')
      .send({
        phoneNumber: 'not-a-phone',
      })
      .expect(422);
  });
});
