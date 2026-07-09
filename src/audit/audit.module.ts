import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }])
  ],
  providers: [AuditService, AuditInterceptor],
  exports: [AuditService, AuditInterceptor]
})
export class AuditModule {}
