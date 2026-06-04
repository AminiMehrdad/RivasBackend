import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-code.enum';

interface ErrorResponse {
  statusCode: number;
  code: ErrorCode | string;
  message: string;
  details?: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const errorResponse = this.toErrorResponse(exception);

    if (errorResponse.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception);
    }

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private toErrorResponse(exception: unknown): ErrorResponse {
    if (exception instanceof AppError) {
      return {
        statusCode: exception.statusCode,
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'object' && response !== null && 'message' in response
          ? this.normalizeMessage(response.message)
          : exception.message;

      return {
        statusCode,
        code: statusCode === HttpStatus.UNPROCESSABLE_ENTITY ? ErrorCode.VALIDATION_FAILED : exception.name,
        message,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred.',
    };
  }

  private normalizeMessage(message: unknown): string {
    if (Array.isArray(message)) {
      return message.join(', ');
    }

    return typeof message === 'string' ? message : 'Request failed.';
  }
}
