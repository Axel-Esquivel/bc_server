import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { AdjustmentQueryDto } from './dto/adjustment-query.dto';
import { InventoryAdjustmentsService } from './inventory-adjustments.service';

@Controller('adjustments')
export class InventoryAdjustmentsController {
  constructor(private readonly adjustmentsService: InventoryAdjustmentsService) {}

  @Post()
  async create(@Body() dto: CreateAdjustmentDto) {
    const result = await this.adjustmentsService.createAdjustment(dto);
    return { message: 'Adjustment created', result };
  }

  @Post(':id/start')
  async start(@Param('id') id: string) {
    const result = await this.adjustmentsService.startCount(id);
    return { message: 'Adjustment counting started', result };
  }

  @Post(':id/post')
  async post(@Param('id') id: string) {
    const result = await this.adjustmentsService.postAdjustment(id);
    return { message: 'Adjustment posted', result };
  }

  @Get()
  async list(@Query() query: AdjustmentQueryDto) {
    const result = await this.adjustmentsService.list(query);
    return { message: 'Adjustments retrieved', result };
  }
}
