import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FavoritesModule } from 'src/favorites/favorites.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { PharmaciesModule } from 'src/pharmacies/pharmacies.module';
import { PublicDrugsModule } from 'src/public-drugs/public-drugs.module';
import { CatalogService } from './catalog.service';
import { InventoryItem, InventoryItemSchema } from './schemas/inventory-item.schema';
import { ManagerCategory, ManagerCategorySchema } from './schemas/manager-category.schema';
import { Product, ProductSchema } from './schemas/product.schema';
import { StockMovement, StockMovementSchema } from './schemas/stock-movement.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: InventoryItem.name, schema: InventoryItemSchema },
      { name: StockMovement.name, schema: StockMovementSchema },
      { name: ManagerCategory.name, schema: ManagerCategorySchema }
    ]),
    forwardRef(() => PharmaciesModule),
    forwardRef(() => NotificationsModule),
    FavoritesModule,
    PublicDrugsModule
  ],
  providers: [CatalogService],
  exports: [CatalogService, MongooseModule]
})
export class CatalogModule {}
