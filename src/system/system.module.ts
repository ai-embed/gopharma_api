import { Module } from '@nestjs/common';
import { IntegrationValidationService } from '../admin/integration-validation.service';
import { SystemController } from './system.controller';

@Module({
  controllers: [SystemController],
  providers: [IntegrationValidationService]
})
export class SystemModule {}
