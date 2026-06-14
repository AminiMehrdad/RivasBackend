import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AUTH_CONSTANTS } from './common/constants/auth.constants';
import { AppValidationPipe } from './common/pipes/validation.pipe';
import { EnvConfig } from './config/env.schema';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<EnvConfig, true>);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://cdn.redoc.ly'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'", 'data:', 'https:'],
        },
      },
    }),
  );
  app.use(cookieParser());
  app.useGlobalPipes(new AppValidationPipe());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Rivas API Service')
    .setDescription(
      'Phone OTP authentication, wallets, API keys, and transcription.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE,
        description: 'JWT refresh token',
      },
      AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE,
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for server-to-server requests',
      },
      'X-API-Key',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('swagger', app, document);
  app.getHttpAdapter().get('/docs', (_request: Request, response: Response) => {
    response.type('text/html').send(`
<!doctype html>
<html>
  <head>
    <title>API Docs</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <redoc spec-url="/swagger-json"></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  </body>
</html>
`);
  });

  await app.listen(configService.get('PORT', { infer: true }));
}

void bootstrap();
