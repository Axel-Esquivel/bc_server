import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransferQueryDto } from './dto/transfer-query.dto';
import { TransfersService } from './transfers.service';

@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  async create(@Body() dto: CreateTransferDto) {
    const result = await this.transfersService.createTransfer(dto);
    return { message: 'Transfer created', result };
  }

  @Post(':id/confirm')
  async confirm(@Param('id') id: string) {
    const result = await this.transfersService.confirmTransfer(id);
    return { message: 'Transfer confirmed', result };
  }

  @Post(':id/dispatch')
  async dispatch(@Param('id') id: string) {
    const result = await this.transfersService.dispatchTransfer(id);
    return { message: 'Transfer dispatched', result };
  }

  @Post(':id/receive')
  async receive(@Param('id') id: string) {
    const result = await this.transfersService.receiveTransfer(id);
    return { message: 'Transfer received', result };
  }

  @Get()
  async list(@Query() query: TransferQueryDto) {
    const result = await this.transfersService.list(query);
    return { message: 'Transfers retrieved', result };
  }
}
