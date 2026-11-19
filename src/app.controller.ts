import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      message: 'GoPharma API',
      version: '0.1.0',
      status: 'running',
      endpoints: {
        health: '/api/health',
        docs: '/api/docs',
        api: '/api/*'
      }
    };
  }
}
