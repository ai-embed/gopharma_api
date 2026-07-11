import { NestFactory } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { AppModule } from '../src/app.module';

let app: INestApplication;

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create(AppModule);
    await app.init();
  }
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await bootstrap();
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp(req, res);
}
