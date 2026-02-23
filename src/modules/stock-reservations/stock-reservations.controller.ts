import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ConsumeStockDto } from './dto/consume-stock.dto';
import { ReleaseStockDto } from './dto/release-stock.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
import { StockReservationQueryDto } from './dto/stock-reservation-query.dto';
import { StockReservationsService } from './stock-reservations.service';

@Controller('reservations')
export class StockReservationsController {
  constructor(private readonly reservationsService: StockReservationsService) {}

  @Post('reserve')
  async reserve(@Body() dto: ReserveStockDto) {
    const result = await this.reservationsService.reserve(dto);
    return { message: 'Stock reserved', result };
  }

  @Post('release')
  async release(@Body() dto: ReleaseStockDto) {
    const result = await this.reservationsService.release(dto);
    return { message: 'Stock reservation released', result };
  }

  @Post('consume')
  async consume(@Body() dto: ConsumeStockDto) {
    const result = await this.reservationsService.consume(dto);
    return { message: 'Stock reservation consumed', result };
  }

  @Get()
  async list(@Query() query: StockReservationQueryDto) {
    const result = await this.reservationsService.list(query);
    return { message: 'Stock reservations retrieved', result };
  }
}
