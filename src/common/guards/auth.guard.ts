import { CanActivate, ExecutionContext, Inject, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { UserRole } from '../../database/entities/user.entity';
import { UnauthorizedError } from '../errors/auth.errors';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { INJECTION_TOKENS } from '../constants/injection-tokens';
import Redis from 'ioredis';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { AuthService } from 'src/auth/auth.service';
import { CookieUtils } from '../utils/cockes.utils';
import { log } from 'console';


export interface RequestUser {
  userId: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: RequestUser;
  accessToken?: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly cookieUtils = new CookieUtils();
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    @Inject(INJECTION_TOKENS.REDIS_CLIENT) private readonly redisClient: Redis,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [
        context.getHandler(),
        context.getClass(),
      ],
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const response = context.switchToHttp().getResponse<Response>();

    const accessToken = this.cookieUtils.getCookie(request, AUTH_CONSTANTS.ACCESS_TOKEN_COOKIE);

    const refreshToken = this.cookieUtils.getCookie(request, AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE);


    if (!accessToken && !refreshToken) {
      throw new UnauthorizedError()
    }

    const isBlacklisted = await this.redisClient.exists(`${AUTH_CONSTANTS.BLACKLIST_PREFIX}${refreshToken}`);

    if (isBlacklisted) {
      throw new UnauthorizedError()
    }
    try {
      const payload = await this.authService.checkAcessToken(accessToken? accessToken : '');
      request['user'] = {
        userId: payload.userId,
        role: payload.role,
      };
      return true;
    } catch (err) {
      // continue to refresh flow for any verify failure
    }

    try {
      const tokens = await this.authService.refresh(refreshToken? refreshToken : '');

      request['user'] = {
        userId: tokens.userId,
        role: tokens.role,
      };


      this.cookieUtils.setCookie(response, AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE, tokens.tokens.refreshToken, this.cookieUtils.cookieOptions(this.authService['configService']));
      this.cookieUtils.setCookie(response, AUTH_CONSTANTS.ACCESS_TOKEN_COOKIE, tokens.tokens.accessToken, this.cookieUtils.cookieOptions(this.authService['configService'], true));

      return true;

    } catch {
      this.cookieUtils.clearCookie(response, AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE, this.cookieUtils.cookieOptions(this.authService['configService']));
      this.cookieUtils.clearCookie(response, AUTH_CONSTANTS.ACCESS_TOKEN_COOKIE, this.cookieUtils.cookieOptions(this.authService['configService'], true));
      throw new UnauthorizedError();
    }
  }

}
