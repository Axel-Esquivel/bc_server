import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AddInventoryCountRoundDto } from './dto/add-round.dto';
import { CreateInventoryCountSessionDto } from './dto/create-inventory-count-session.dto';
import { ReviewInventoryCountDto } from './dto/review-inventory-count.dto';
import { InventoryCountsService } from './inventory-counts.service';

@Controller('inventory-counts')
export class InventoryCountsController {
  constructor(private readonly inventoryCountsService: InventoryCountsService) {}

  @Post()
  create(@Body() dto: CreateInventoryCountSessionDto) {
    return {
      message: 'Inventory count session created',
      result: this.inventoryCountsService.createSession(dto),
    };
  }

  @Post(':id/rounds')
  registerRound(@Param('id') id: string, @Body() dto: AddInventoryCountRoundDto) {
    return {
      message: 'Inventory count round registered',
      result: this.inventoryCountsService.registerRound(id, dto),
    };
  }

  @Post(':id/review')
  review(@Param('id') id: string, @Body() dto: ReviewInventoryCountDto) {
    return {
      message: 'Inventory count session moved to review',
      result: this.inventoryCountsService.review(id, dto),
    };
  }

  @Post(':id/post')
  postAdjustments(@Param('id') id: string) {
    return {
      message: 'Inventory count adjustments posted',
      result: this.inventoryCountsService.post(id),
    };
  }

  @Get(':id')
  getSession(@Param('id') id: string) {
    return {
      message: 'Inventory count session retrieved',
      result: this.inventoryCountsService.list(id),
    };
  }
}
