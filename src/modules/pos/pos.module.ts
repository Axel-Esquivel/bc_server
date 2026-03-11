import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { ProductsModule } from '../products/products.module';
import { CompaniesModule } from '../companies/companies.module';
import { OutboxModule } from '../outbox/outbox.module';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';

@Module({
  imports: [InventoryModule, ProductsModule, CompaniesModule, OutboxModule],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
