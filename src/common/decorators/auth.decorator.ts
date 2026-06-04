import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { UserRole } from '../../database/entities/user.entity';
import { AUTH_ROLES_KEY } from '../guards/auth.guard';

export const Auth = (...roles: UserRole[]) =>
  applyDecorators(
    SetMetadata(AUTH_ROLES_KEY, roles),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
    ApiForbiddenResponse({ description: 'Access is forbidden.' }),
  );
