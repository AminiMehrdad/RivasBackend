import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForbiddenError, UnauthorizedError } from '../../src/common/errors/auth.errors';
import { AUTH_ROLES_KEY, AuthGuard } from '../../src/common/guards/auth.guard';
import { UserRole } from '../../src/database/entities/user.entity';

const createContext = (user?: { userId: string; role: UserRole }): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => createContext,
    getClass: () => AuthGuard,
  }) as unknown as ExecutionContext;

describe('AuthGuard', () => {
  let reflector: jest.Mocked<Reflector>;
  let guard: AuthGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new AuthGuard(reflector);
  });

  it('allows requests when route is not protected', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('throws unauthorized when protected route has no authenticated user', () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    expect(() => guard.canActivate(createContext())).toThrow(UnauthorizedError);
  });

  it('allows any authenticated user when no role is required', () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    expect(guard.canActivate(createContext({ userId: 'user-1', role: UserRole.USER }))).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(AUTH_ROLES_KEY, [
      expect.any(Function),
      AuthGuard,
    ]);
  });

  it('allows users with a required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(guard.canActivate(createContext({ userId: 'admin-1', role: UserRole.ADMIN }))).toBe(true);
  });

  it('throws forbidden when authenticated user lacks a required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(() =>
      guard.canActivate(createContext({ userId: 'user-1', role: UserRole.USER })),
    ).toThrow(ForbiddenError);
  });
});
