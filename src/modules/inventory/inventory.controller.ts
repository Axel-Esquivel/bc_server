import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';
import { StockQueryDto } from './dto/stock-query.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('stock')
  findStock(@Query() query: StockQueryDto) {
    return {
      message: 'Stock projection list retrieved',
      result: this.inventoryService.listStock(query),
    };
  }

  @Post('movements')
  recordMovement(@Body() dto: CreateInventoryMovementDto) {
    return {
      message: 'Inventory movement recorded',
      result: this.inventoryService.recordMovement(dto),
    };
  }
}
