import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';
import Redis from 'ioredis';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { INJECTION_TOKENS } from '../constants/injection-tokens';
import { RequestUser } from '../interfaces/request-user.interface';

export interface AuthenticatedRequest extends Request {
  user?: RequestUser;
  accessToken?: string;
}

@Injectable()
export class AuthTokenMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(INJECTION_TOKENS.REDIS_CLIENT) private readonly redisClient: Redis,
  ) {}

  async use(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> {
    const token = this.extractToken(req);

    if (!token) {
      next();
      return;
    }

    const isBlacklisted = await this.redisClient.exists(`${AUTH_CONSTANTS.BLACKLIST_PREFIX}${token}`);
    if (isBlacklisted) {
      next();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<RequestUser>(token);
      req.user = {
        userId: payload.userId,
        role: payload.role,
      };
      req.accessToken = token;
    } catch {
      // Authentication remains optional here; endpoint handlers decide whether it is required.
    }

    next();
  }

  private extractToken(req: Request): string | undefined {
    const authHeader = req.header('authorization');
    if (authHeader?.startsWith(AUTH_CONSTANTS.AUTH_HEADER_PREFIX)) {
      return authHeader.slice(AUTH_CONSTANTS.AUTH_HEADER_PREFIX.length);
    }

    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    return cookies?.[AUTH_CONSTANTS.ACCESS_TOKEN_COOKIE];
  }
}
