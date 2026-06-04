export const AUTH_CONSTANTS = {
  ACCESS_TOKEN_COOKIE: 'accessToken',
  REFRESH_TOKEN_COOKIE: 'refreshToken',
  AUTH_HEADER_PREFIX: 'Bearer ',
  REFRESH_TOKEN_BYTES: 48,
  PASSWORD_MIN_LENGTH: 12,
  OTP_LENGTH: 6,
  OTP_TTL_SECONDS: 120,
  OTP_PREFIX: 'auth:otp:',
  REFRESH_TOKEN_PREFIX: 'auth:refresh:',
  BLACKLIST_PREFIX: 'auth:blacklist:',
} as const;
