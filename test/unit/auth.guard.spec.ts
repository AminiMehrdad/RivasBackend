import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyService } from '../../src/apiKey/apiKey.service';
import { AUTH_CONSTANTS } from '../../src/common/constants/auth.constants';
import { IS_PUBLIC_KEY } from '../../src/common/decorators/public.decorator';
import { UnauthorizedError } from '../../src/common/errors/auth.errors';
import { AuthGuard, AuthenticatedRequest } from '../../src/common/guards/auth.guard';
import { AuthService } from '../../src/auth/auth.service';
import { ApiKeyEntity } from '../../src/database/entities/apikey.entity';
import { UserRole } from '../../src/database/entities/user.entity';

type MockRequest = Partial<Omit<AuthenticatedRequest, 'get'>> & {
  headers: Record<string, string | undefined>;
  get: jest.Mock<string | undefined, [string]>;
};

const createRequest = (
  headers: Record<string, string | undefined> = {},
): MockRequest => ({
  headers,
  get: jest.fn((name: string) => headers[name] ?? headers[name.toLowerCase()]),
});

const createContext = (
  request: MockRequest = createRequest(),
  response: { setHeader: jest.Mock } = { setHeader: jest.fn() },
): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request as AuthenticatedRequest,
      getResponse: () => response,
    }),
    getHandler: () => createContext,
    getClass: () => AuthGuard,
  }) as unknown as ExecutionContext;

describe('AuthGuard', () => {
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let authService: jest.Mocked<Pick<AuthService, 'checkAcessToken' | 'refresh'>>;
  let apiKeyService: jest.Mocked<Pick<ApiKeyService, 'validate'>>;
  let redisClient: { exists: jest.Mock<Promise<number>, [string]> };
  let guard: AuthGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };
    authService = {
      checkAcessToken: jest.fn(),
      refresh: jest.fn(),
    };
    apiKeyService = {
      validate: jest.fn(),
    };
    redisClient = {
      exists: jest.fn().mockResolvedValue(0),
    };

    guard = new AuthGuard(
      reflector as unknown as Reflector,
      authService as unknown as AuthService,
      apiKeyService as unknown as ApiKeyService,
      redisClient as never,
    );
  });

  it('allows requests when route is public', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      expect.any(Function),
      AuthGuard,
    ]);
  });

  it('throws unauthorized when protected route has no credentials', async () => {
    await expect(guard.canActivate(createContext())).rejects.toThrow(UnauthorizedError);
  });

  it('authenticates requests with a valid API key', async () => {
    const request = createRequest({ 'x-api-key': 'raw-api-key' });
    const apiKey = { userId: 'user-1' } as ApiKeyEntity;
    apiKeyService.validate.mockResolvedValue(apiKey);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(apiKeyService.validate).toHaveBeenCalledWith('raw-api-key');
    expect(request.apiKey).toBe(apiKey);
    expect(request.user).toEqual({
      userId: 'user-1',
      role: UserRole.USER,
      authType: 'api-key',
    });
    expect(authService.checkAcessToken).not.toHaveBeenCalled();
  });

  it('authenticates requests with a valid access token', async () => {
    const request = createRequest({ authorization: 'Bearer access-token' });
    authService.checkAcessToken.mockResolvedValue({
      userId: 'admin-1',
      role: UserRole.ADMIN,
    });

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(redisClient.exists).toHaveBeenCalledWith(
      `${AUTH_CONSTANTS.BLACKLIST_PREFIX}access-token`,
    );
    expect(authService.checkAcessToken).toHaveBeenCalledWith('access-token');
    expect(request.user).toEqual({
      userId: 'admin-1',
      role: UserRole.ADMIN,
      authType: 'jwt',
    });
  });

  it('throws unauthorized when access token is blacklisted', async () => {
    const request = createRequest({ authorization: 'Bearer access-token' });
    redisClient.exists.mockResolvedValue(1);

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(UnauthorizedError);
    expect(authService.checkAcessToken).not.toHaveBeenCalled();
  });

  it('refreshes tokens when access token validation fails', async () => {
    const request = createRequest({
      authorization: 'Bearer expired-token',
      'x-refresh-token': 'refresh-token',
    });
    const response = { setHeader: jest.fn() };
    authService.checkAcessToken.mockRejectedValue(new Error('expired'));
    authService.refresh.mockResolvedValue({
      userId: 'user-1',
      role: UserRole.USER,
      tokens: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
      },
    });


    await expect(guard.canActivate(createContext(request, response))).resolves.toBe(true);
    expect(authService.refresh).toHaveBeenCalledWith('refresh-token');
    expect(request.user).toEqual({
      userId: 'user-1',
      role: UserRole.USER,
      authType: 'jwt',
    });
    expect(response.setHeader).toHaveBeenCalledWith('X-Access-Token', 'new-access-token');
    expect(response.setHeader).toHaveBeenCalledWith('X-Refresh-Token', 'new-refresh-token');
  });

  it('clears token headers and throws unauthorized when refresh fails', async () => {
    const request = createRequest({ 'x-refresh-token': 'refresh-token' });
    const response = { setHeader: jest.fn() };
    authService.checkAcessToken.mockRejectedValue(new Error('missing access token'));
    authService.refresh.mockRejectedValue(new Error('invalid refresh token'));

    await expect(guard.canActivate(createContext(request, response))).rejects.toThrow(
      UnauthorizedError,
    );
    expect(response.setHeader).toHaveBeenCalledWith('X-Access-Token', '');
    expect(response.setHeader).toHaveBeenCalledWith('X-Refresh-Token', '');
  });
});
