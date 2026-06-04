import { HttpStatus } from '@nestjs/common';
import { AppError } from './app-error';
import { ErrorCode } from './error-code.enum';

export class DuplicatePhoneNumberError extends AppError {
  constructor() {
    super(ErrorCode.DUPLICATE_PHONE_NUMBER, HttpStatus.CONFLICT, 'Phone number is already registered.');
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super(ErrorCode.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED, 'Invalid credentials.');
  }
}

export class InvalidOtpError extends AppError {
  constructor() {
    super(ErrorCode.INVALID_OTP, HttpStatus.UNAUTHORIZED, 'Verification code is invalid or expired.');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication is required.') {
    super(ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, message);
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super(ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN, 'Access is forbidden.');
  }
}

export class InvalidRefreshTokenError extends AppError {
  constructor() {
    super(ErrorCode.INVALID_REFRESH_TOKEN, HttpStatus.UNAUTHORIZED, 'Refresh token is invalid or expired.');
  }
}
