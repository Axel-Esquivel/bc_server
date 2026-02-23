import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LocationsModule } from '../locations/locations.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { OutboxModule } from '../outbox/outbox.module';
import { Stock, StockSchema } from '../stock/entities/stock.entity';
import { StockMovementsController } from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';
import { StockMovement, StockMovementSchema } from './entities/stock-movement.entity';

@Module({
  imports: [
    LocationsModule,
    OrganizationsModule,
    OutboxModule,
    MongooseModule.forFeature([
      { name: StockMovement.name, schema: StockMovementSchema },
      { name: Stock.name, schema: StockSchema },
    ]),
  ],
  controllers: [StockMovementsController],
  providers: [StockMovementsService],
})
export class StockMovementsModule {}
