import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LocationsModule } from '../locations/locations.module';
import { OutboxModule } from '../outbox/outbox.module';
import { StockReservationsModule } from '../stock-reservations/stock-reservations.module';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { Transfer, TransferSchema } from './entities/transfer.entity';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';

@Module({
  imports: [
    LocationsModule,
    OutboxModule,
    StockMovementsModule,
    StockReservationsModule,
    MongooseModule.forFeature([{ name: Transfer.name, schema: TransferSchema }]),
  ],
  controllers: [TransfersController],
  providers: [TransfersService],
})
export class TransfersModule {}
