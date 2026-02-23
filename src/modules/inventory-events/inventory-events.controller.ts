import { Controller, Param, Post, Query } from '@nestjs/common';
import { InventoryEventsService } from './inventory-events.service';

@Controller('inventory/events')
export class InventoryEventsController {
  constructor(private readonly inventoryEventsService: InventoryEventsService) {}

  @Post('process-outbox')
  async processOutbox(@Query('limit') limit?: string) {
    const batch = limit ? Number(limit) : undefined;
    const result = await this.inventoryEventsService.consumePending(
      Number.isFinite(batch) ? (batch as number) : 50,
    );
    return { message: 'Inventory outbox processed', result };
  }

  @Post(':orgId/process-outbox')
  async processOutboxByOrg(@Param('orgId') _orgId: string, @Query('limit') limit?: string) {
    const batch = limit ? Number(limit) : undefined;
    const result = await this.inventoryEventsService.consumePending(
      Number.isFinite(batch) ? (batch as number) : 50,
    );
    return { message: 'Inventory outbox processed', result };
  }
}
