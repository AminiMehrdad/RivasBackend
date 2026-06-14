import { AuthenticatedRequest } from '../guards/auth.guard';
import { UnauthorizedError } from '../errors/auth.errors';

export function getAuthenticatedUserId(request: AuthenticatedRequest): string {
  const userId = request.user?.userId;

  if (!userId) {
    throw new UnauthorizedError();
  }

  return userId;
}
