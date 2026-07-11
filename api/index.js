const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { AppModule } = require('../dist/app.module');
const { HttpProblemDetailsFilter } = require('../dist/common/filters/http-problem-details.filter');
const { LocalizationService } = require('../dist/common/localization/localization.service');

let app;

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

async function handler(req, res) {
  const app = await bootstrap();
  const expressApp = app.getHttpAdapter().getInstance();
  
  expressApp(req, res);
}

module.exports = handler;
