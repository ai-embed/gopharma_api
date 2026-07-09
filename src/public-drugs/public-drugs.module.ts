import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from 'src/catalog/schemas/product.schema';
import { PublicDrugsController } from './public-drugs.controller';
import { PublicDrugsService } from './public-drugs.service';
import {
  AdminMedicament,
  AdminMedicamentSchema
} from './schemas/admin-medicament.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminMedicament.name, schema: AdminMedicamentSchema },
      { name: Product.name, schema: ProductSchema }
    ])
  ],
  controllers: [PublicDrugsController],
  providers: [PublicDrugsService],
  exports: [PublicDrugsService]
})
export class PublicDrugsModule {}
