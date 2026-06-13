import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from '../config/env.schema';
import * as path from "path";
import * as fs from "fs/promises";


export interface SmsService {
  sendVerificationCode(phoneNumber: string, code: string): Promise<void>;
  dummyRequst(phoneNumber: string, code: string): Promise<void>;
}

@Injectable()
export class HttpSmsService implements SmsService {
  private readonly logger = new Logger(HttpSmsService.name);

  constructor(private readonly configService: ConfigService<EnvConfig, true>) { }

  async sendVerificationCode(phoneNumber: string, code: string): Promise<void> {
    const apiUrl = this.configService.get('SMS_API_URL', { infer: true });

    if (!apiUrl) {
      this.handleMissingProvider(phoneNumber, code);
      return;
    }



    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: this.createHeaders(),
      body: JSON.stringify({
        "mobile": phoneNumber,
        // "templateId": 559904,
        "parameters": [
          { name: 'کد یک بار مصرف شما:', value: code }
        ],
      }),
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => '');
      this.logger.error(`SMS provider failed with status ${response.status}: ${responseText}`);
      throw new InternalServerErrorException('Failed to send verification code.');
    }
  }

  private createHeaders(): Record<string, string> {
    const apiKey = this.configService.get('SMS_API_KEY', { infer: true });
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/plain',
      'x-api-key': apiKey || '',
    };
    return headers;
  }

  private handleMissingProvider(phoneNumber: string, code: string): void {
    const nodeEnv = this.configService.get('NODE_ENV', { infer: true });

    if (nodeEnv === 'production') {
      throw new InternalServerErrorException('SMS provider is not configured.');
    }

    this.logger.warn(`SMS provider is not configured. Verification code for ${phoneNumber}: ${code}`);
  }


  async dummyRequst(phoneNumber: string, code: string): Promise<void> {
    const logFile = path.join(__dirname, "../../../Logs/loginCode.txt")

    const generatedAt = new Date();
    const expiresAt = new Date(generatedAt.getTime() + 120 * 1000);

    const logEntry = `
        Generated: ${generatedAt.toLocaleString()}
        Expires:   ${expiresAt.toLocaleString()}
        ${phoneNumber} ---> ${code}
        ==========
        `;
    await fs.appendFile(logFile, logEntry, 'utf8');
    this.logger.warn(`SMS provider gnerate code in ${logFile}`);
  }
}
