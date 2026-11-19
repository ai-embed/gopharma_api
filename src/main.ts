import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { HttpProblemDetailsFilter } from './common/filters/http-problem-details.filter';
import { LocalizationService } from './common/localization/localization.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const express = app.getHttpAdapter().getInstance();

  express.disable('x-powered-by');

  const apiPrefix = process.env.API_PREFIX === '' ? '' : (process.env.API_PREFIX ?? 'api');
  app.setGlobalPrefix(apiPrefix);

  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.use((request: Request, response: Response, next: NextFunction) => {
    const requestId = String(request.headers['x-request-id'] ?? randomUUID());
    request.headers['x-request-id'] = requestId;

    response.setHeader('X-Request-Id', requestId);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      forbidUnknownValues: true,
      transformOptions: { enableImplicitConversion: true }
    })
  );

  const localizationService = app.get(LocalizationService);
  app.useGlobalFilters(new HttpProblemDetailsFilter(localizationService));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('GoPharma API')
    .setDescription('Backend API for GoPharma platform')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      },
      'bearer'
    )
    .build();

  const doc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, doc);

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}

bootstrap();
