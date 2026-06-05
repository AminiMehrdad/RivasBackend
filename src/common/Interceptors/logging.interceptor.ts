import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);
  private readonly logDir = path.join(process.cwd(), 'Logs');
  private readonly logFile = path.join(this.logDir, 'app.log');

  constructor() {
    this.ensureLogDirectory();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const method = request.method;
    const url = request.url;
    const start = Date.now();
    const timestamp = new Date().toISOString();

    const requestInfo = {
      method,
      url,
      ip: request.ip,
      user: request.user ? this.formatUser(request.user) : undefined,
      params: request.params,
      query: request.query,
      body: this.safeSerialize(request.body),
    };

    this.appendLog('INFO', 'Incoming request', requestInfo, timestamp);

    return next.handle().pipe(
      tap((responseBody) => {
        const duration = Date.now() - start;
        this.appendLog(
          'INFO',
          'Request completed',
          {
            ...requestInfo,
            durationMs: duration,
            response: this.safeSerialize(responseBody),
          },
          new Date().toISOString(),
        );
      }),
      catchError((error) => {
        const duration = Date.now() - start;
        const errorInfo = {
          ...requestInfo,
          durationMs: duration,
          errorName: error?.name,
          errorMessage: error?.message,
          stack: error?.stack,
        };
        this.appendLog('ERROR', 'Request failed', errorInfo, new Date().toISOString());
        throw error;
      }),
    );
  }

  private ensureLogDirectory(): void {
    try {
      fs.mkdirSync(this.logDir, { recursive: true });
    } catch (error) {
      this.logger.error(`Unable to create log directory ${this.logDir}: ${error}`);
    }
  }

  private appendLog(level: string, message: string, meta: unknown, timestamp: string): void {
    const entry = {
      timestamp,
      level,
      message,
      meta,
    };
    const logLine = `${JSON.stringify(entry)}\n`;

    fs.appendFile(this.logFile, logLine, 'utf8', (err) => {
      if (err) {
        this.logger.error(`Failed to write log to ${this.logFile}: ${err.message}`);
      }
    });
  }

  private safeSerialize(value: unknown): unknown {
    if (value === undefined) {
      return undefined;
    }
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return String(value);
    }
  }

  private formatUser(user: unknown): unknown {
    if (!user || typeof user !== 'object') {
      return user;
    }
    const { password, ...rest } = user as Record<string, any>;
    return this.safeSerialize(rest);
  }
}
