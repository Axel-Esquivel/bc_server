import { Module } from '@nestjs/common';
import { LocationsModule } from '../locations/locations.module';
import { OutboxModule } from '../outbox/outbox.module';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { InventoryEventsController } from './inventory-events.controller';
import { InventoryEventsService } from './inventory-events.service';

@Module({
  imports: [OutboxModule, LocationsModule, StockMovementsModule],
  controllers: [InventoryEventsController],
  providers: [InventoryEventsService],
})
export class InventoryEventsModule {}
