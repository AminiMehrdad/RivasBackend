import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../database/entities/user.entity';
import { ForbiddenError, UnauthorizedError } from '../errors/auth.errors';
import { AuthenticatedRequest } from '../middleware/auth-token.middleware';

export const AUTH_ROLES_KEY = 'auth:roles';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(AUTH_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (roles === undefined) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new UnauthorizedError();
    }

    if (roles?.length && !roles.includes(request.user.role)) {
      throw new ForbiddenError();
    }

    return true;
  }
}
