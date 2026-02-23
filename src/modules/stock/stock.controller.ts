import { Controller, Get, Query } from '@nestjs/common';
import { StockQueryDto } from './dto/stock-query.dto';
import { StockService } from './stock.service';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  async list(@Query() query: StockQueryDto) {
    const result = await this.stockService.list(query);
    return { message: 'Stock retrieved', result };
  }
}
