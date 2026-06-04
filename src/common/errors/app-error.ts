import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-code.enum';

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly statusCode: HttpStatus,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = AppError.name;
  }
}
