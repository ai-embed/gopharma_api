import { NestFactory } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { AppModule } from '../src/app.module';
import { HttpProblemDetailsFilter } from '../src/common/filters/http-problem-details.filter';
import { LocalizationService } from '../src/common/localization/localization.service';

let app: INestApplication;

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create(AppModule);
    
    const apiPrefix = process.env.API_PREFIX ?? 'api';
    app.setGlobalPrefix(apiPrefix);

    const corsOrigins = (process.env.CORS_ORIGINS ?? '*').split(',');
    app.enableCors({
      origin: corsOrigins,
      credentials: true,
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
    
    await app.init();
  }
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await bootstrap();
  const expressApp = app.getHttpAdapter().getInstance();
  
  // Handle the request
  expressApp(req, res);
}
