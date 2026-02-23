import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Stock, StockSchema } from '../stock/entities/stock.entity';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { InventoryAdjustment, InventoryAdjustmentSchema } from './entities/inventory-adjustment.entity';
import { InventoryAdjustmentsController } from './inventory-adjustments.controller';
import { InventoryAdjustmentsService } from './inventory-adjustments.service';

@Module({
  imports: [
    StockMovementsModule,
    MongooseModule.forFeature([
      { name: InventoryAdjustment.name, schema: InventoryAdjustmentSchema },
      { name: Stock.name, schema: StockSchema },
    ]),
  ],
  controllers: [InventoryAdjustmentsController],
  providers: [InventoryAdjustmentsService],
})
export class InventoryAdjustmentsModule {}
