import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OutboxModule } from '../outbox/outbox.module';
import { Stock, StockSchema } from '../stock/entities/stock.entity';
import { StockReservationsController } from './stock-reservations.controller';
import { StockReservationsService } from './stock-reservations.service';
import { StockReservation, StockReservationSchema } from './entities/stock-reservation.entity';

@Module({
  imports: [
    OutboxModule,
    MongooseModule.forFeature([
      { name: StockReservation.name, schema: StockReservationSchema },
      { name: Stock.name, schema: StockSchema },
    ]),
  ],
  controllers: [StockReservationsController],
  providers: [StockReservationsService],
})
export class StockReservationsModule {}
