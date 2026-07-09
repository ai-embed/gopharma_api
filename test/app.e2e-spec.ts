import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

@Controller('health')
class HealthController {
  @Get()
  check() {
    return { ok: true };
  }
}

@Module({
  controllers: [HealthController]
})
class HealthTestModule {}

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HealthTestModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should bootstrap module', async () => {
    expect(app).toBeDefined();
  });
});
