import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from 'src/audit/audit.module';
import { InventoryItem, InventoryItemSchema } from 'src/catalog/schemas/inventory-item.schema';
import { Product, ProductSchema } from 'src/catalog/schemas/product.schema';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { PharmaciesModule } from 'src/pharmacies/pharmacies.module';
import { PublicDrugsModule } from 'src/public-drugs/public-drugs.module';
import { UsersModule } from 'src/users/users.module';
import { MailerService } from 'src/common/services/mailer.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { IntegrationValidationService } from './integration-validation.service';
import { Suspension, SuspensionSchema } from './schemas/suspension.schema';

@Module({
  imports: [
    AuditModule,
    UsersModule,
    PublicDrugsModule,
    forwardRef(() => PharmaciesModule),
    forwardRef(() => NotificationsModule),
    MongooseModule.forFeature([
      { name: Suspension.name, schema: SuspensionSchema },
      { name: Product.name, schema: ProductSchema },
      { name: InventoryItem.name, schema: InventoryItemSchema }
    ])
  ],
  controllers: [AdminController],
  providers: [AdminService, IntegrationValidationService, MailerService],
  exports: [AdminService]
})
export class AdminModule {}
