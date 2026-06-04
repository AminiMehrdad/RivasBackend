import { randomBytes, createHash } from 'crypto';
import { AUTH_CONSTANTS } from '../constants/auth.constants';

export const createOpaqueToken = (): string =>
  randomBytes(AUTH_CONSTANTS.REFRESH_TOKEN_BYTES).toString('base64url');

export const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');
