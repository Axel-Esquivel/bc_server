import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PostStockMovementDto } from './dto/post-stock-movement.dto';
import { StockMovementQueryDto } from './dto/stock-movement-query.dto';
import { StockMovementsService } from './stock-movements.service';

@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly movementsService: StockMovementsService) {}

  @Post('post')
  async post(@Body() dto: PostStockMovementDto) {
    const result = await this.movementsService.postMovement(dto);
    return { message: 'Stock movement posted', result };
  }

  @Get()
  async list(@Query() query: StockMovementQueryDto) {
    const result = await this.movementsService.list(query);
    return { message: 'Stock movements retrieved', result };
  }
}
