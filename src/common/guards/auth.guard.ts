import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { UserRole } from '../../database/entities/user.entity';
import { UnauthorizedError } from '../errors/auth.errors';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { INJECTION_TOKENS } from '../constants/injection-tokens';
import Redis from 'ioredis';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { AuthService } from 'src/auth/auth.service';
import { HeaderUtils } from '../utils/header.utils';
import { ApiKeyService } from 'src/apiKey/apiKey.service';
import { ApiKeyEntity } from 'src/database/entities/apikey.entity';

export interface RequestUser {
  userId: string;
  role: UserRole;
  authType: 'jwt' | 'api-key';
}

export interface AuthenticatedRequest extends Request {
  user?: RequestUser;
  accessToken?: string;
  apiKey?: ApiKeyEntity;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly headerUtils = new HeaderUtils();

  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly apiKeyService: ApiKeyService,
    @Inject(INJECTION_TOKENS.REDIS_CLIENT) private readonly redisClient: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const response = context.switchToHttp().getResponse<Response>();

    const rawApiKey = request.get('x-api-key');
    
    if (rawApiKey) {
      const apiKey = await this.apiKeyService.validate(rawApiKey);
      request.apiKey = apiKey;
      request.user = {
        userId: apiKey.userId,
        role: UserRole.USER,
        authType: 'api-key',
      };
      return true;
    }

    const accessToken = this.headerUtils.getAccessToken(request);

    const refreshToken = this.headerUtils.getRefreshToken(request);

    if (!accessToken && !refreshToken) {
      throw new UnauthorizedError();
    }

    const isBlacklisted = await this.redisClient.exists(
      `${AUTH_CONSTANTS.BLACKLIST_PREFIX}${accessToken}`,
    );

    if (isBlacklisted) {
      throw new UnauthorizedError();
    }
    try {
      const payload = await this.authService.checkAcessToken(
        accessToken ? accessToken : '',
      );
      request['user'] = {
        userId: payload.userId,
        role: payload.role,
        authType: 'jwt',
      };
      return true;
    } catch {
      // continue to refresh flow for any verify failure
    }

    try {
      const tokens = await this.authService.refresh(
        refreshToken ? refreshToken : '',
      );

      request['user'] = {
        userId: tokens.userId,
        role: tokens.role,
        authType: 'jwt',
      };

      this.headerUtils.setTokenHeaders(
        response,
        tokens.tokens.accessToken,
        tokens.tokens.refreshToken,
      );

      return true;
    } catch {
      this.headerUtils.clearTokenHeaders(response);
      throw new UnauthorizedError();
    }
  }
}
