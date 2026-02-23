import { BadRequestException, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';
import { v4 as uuid } from 'uuid';
import type { JsonObject } from '../../core/events/business-event';
import { LocationUsage } from '../locations/entities/location.entity';
import { LOCATION_CODES } from '../locations/locations.service';
import { LocationsService } from '../locations/locations.service';
import { OutboxService } from '../outbox/outbox.service';
import { ReserveStockDto } from '../stock-reservations/dto/reserve-stock.dto';
import { StockReservationsService } from '../stock-reservations/stock-reservations.service';
import { PostStockMovementDto } from '../stock-movements/dto/post-stock-movement.dto';
import { StockMovementType } from '../stock-movements/entities/stock-movement.entity';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransferQueryDto } from './dto/transfer-query.dto';
import { Transfer, TransferDocument, TransferLine, TransferState } from './entities/transfer.entity';

export interface TransferRecord {
  id: string;
  organizationId: string;
  enterpriseId: string;
  originWarehouseId: string;
  destinationWarehouseId: string;
  state: TransferState;
  lines: Array<{ lineId: string; productId: string; qty: number }>;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TransferEventPayload extends JsonObject {
  transferId: string;
  enterpriseId: string;
  originWarehouseId: string;
  destinationWarehouseId: string;
  lines: Array<{ productId: string; qty: number }>;
}

@Injectable()
export class TransfersService {
  private readonly logger = new Logger(TransfersService.name);

  constructor(
    @InjectModel(Transfer.name)
    private readonly transferModel: Model<TransferDocument>,
    private readonly locationsService: LocationsService,
    private readonly stockMovementsService: StockMovementsService,
    private readonly outboxService: OutboxService,
    @Optional()
    private readonly stockReservationsService?: StockReservationsService,
  ) {}

  async createTransfer(dto: CreateTransferDto): Promise<TransferRecord> {
    this.assertOrgEnterprise(dto.organizationId, dto.enterpriseId);
    if (dto.originWarehouseId === dto.destinationWarehouseId) {
      throw new BadRequestException('Origin and destination warehouses must differ');
    }
    if (!dto.lines?.length) {
      throw new BadRequestException('Transfer requires lines');
    }
    const originWarehouseId = new MongooseSchema.Types.ObjectId(dto.originWarehouseId);
    const destinationWarehouseId = new MongooseSchema.Types.ObjectId(dto.destinationWarehouseId);
    const lines: TransferLine[] = dto.lines.map((line) => ({
      lineId: uuid(),
      productId: line.productId.trim(),
      qty: line.qty,
    }));

    const created = await this.transferModel.create({
      organizationId: dto.organizationId,
      enterpriseId: dto.enterpriseId,
      originWarehouseId,
      destinationWarehouseId,
      state: 'draft',
      lines,
    });

    return this.toRecord(created);
  }

  async confirmTransfer(id: string): Promise<TransferRecord> {
    const transfer = await this.getTransfer(id);
    if (transfer.state !== 'draft') {
      return transfer;
    }

    if (this.stockReservationsService) {
      const originStockLocation = await this.findStockLocation(transfer.originWarehouseId, transfer);
      for (const line of transfer.lines) {
        const reserve: ReserveStockDto = {
          organizationId: transfer.organizationId,
          enterpriseId: transfer.enterpriseId,
          productId: line.productId,
          locationId: originStockLocation,
          qty: line.qty,
          reference: {
            module: 'transfers',
            entity: 'transfer',
            entityId: transfer.id,
            lineId: line.lineId,
          },
        };
        await this.stockReservationsService.reserve(reserve);
      }
    }

    await this.transferModel.updateOne(
      { _id: new MongooseSchema.Types.ObjectId(transfer.id) },
      { $set: { state: 'confirmed' } },
    ).exec();

    return { ...transfer, state: 'confirmed' };
  }

  async dispatchTransfer(id: string): Promise<TransferRecord> {
    const transfer = await this.getTransfer(id);
    if (transfer.state !== 'confirmed') {
      throw new BadRequestException('Transfer must be confirmed to dispatch');
    }

    const originStockLocation = await this.findStockLocation(transfer.originWarehouseId, transfer);
    const originTransitLocation = await this.findTransitLocation(transfer.originWarehouseId, transfer);

    for (const line of transfer.lines) {
      const movement: PostStockMovementDto = {
        organizationId: transfer.organizationId,
        enterpriseId: transfer.enterpriseId,
        type: StockMovementType.INTERNAL,
        productId: line.productId,
        qty: line.qty,
        fromLocationId: originStockLocation,
        toLocationId: originTransitLocation,
        unitCost: 0,
        allowNegative: false,
        reference: {
          module: 'transfers',
          entity: 'transfer',
          entityId: transfer.id,
          lineId: line.lineId,
        },
      };
      await this.stockMovementsService.postMovement(movement);
    }

    await this.transferModel.updateOne(
      { _id: new MongooseSchema.Types.ObjectId(transfer.id) },
      { $set: { state: 'in_transit' } },
    ).exec();

    const updated: TransferRecord = { ...transfer, state: 'in_transit' };
    await this.emitEvent('TransferDispatched', updated);
    return updated;
  }

  async receiveTransfer(id: string): Promise<TransferRecord> {
    const transfer = await this.getTransfer(id);
    if (transfer.state !== 'in_transit') {
      throw new BadRequestException('Transfer must be in transit to receive');
    }

    const originTransitLocation = await this.findTransitLocation(transfer.originWarehouseId, transfer);
    const destinationStockLocation = await this.findStockLocation(transfer.destinationWarehouseId, transfer);

    for (const line of transfer.lines) {
      const movement: PostStockMovementDto = {
        organizationId: transfer.organizationId,
        enterpriseId: transfer.enterpriseId,
        type: StockMovementType.INTERNAL,
        productId: line.productId,
        qty: line.qty,
        fromLocationId: originTransitLocation,
        toLocationId: destinationStockLocation,
        unitCost: 0,
        allowNegative: false,
        reference: {
          module: 'transfers',
          entity: 'transfer',
          entityId: transfer.id,
          lineId: line.lineId,
        },
      };
      await this.stockMovementsService.postMovement(movement);
    }

    await this.transferModel.updateOne(
      { _id: new MongooseSchema.Types.ObjectId(transfer.id) },
      { $set: { state: 'done' } },
    ).exec();

    const updated: TransferRecord = { ...transfer, state: 'done' };
    await this.emitEvent('TransferReceived', updated);
    return updated;
  }

  async list(query: TransferQueryDto): Promise<TransferRecord[]> {
    this.assertOrgEnterprise(query.organizationId, query.enterpriseId);
    const filters: Record<string, unknown> = {
      organizationId: query.organizationId,
      enterpriseId: query.enterpriseId,
    };
    if (query.originWarehouseId) {
      filters.originWarehouseId = new MongooseSchema.Types.ObjectId(query.originWarehouseId);
    }
    if (query.destinationWarehouseId) {
      filters.destinationWarehouseId = new MongooseSchema.Types.ObjectId(query.destinationWarehouseId);
    }
    if (query.state) {
      filters.state = query.state;
    }
    const transfers = await this.transferModel
      .find(filters)
      .sort({ createdAt: -1 })
      .lean<TransferDocument[]>()
      .exec();
    return transfers.map((transfer) => this.toRecord(transfer));
  }

  private async emitEvent(eventType: string, transfer: TransferRecord): Promise<void> {
    const payload: TransferEventPayload = {
      transferId: transfer.id,
      enterpriseId: transfer.enterpriseId,
      originWarehouseId: transfer.originWarehouseId,
      destinationWarehouseId: transfer.destinationWarehouseId,
      lines: transfer.lines.map((line) => ({ productId: line.productId, qty: line.qty })),
    };

    try {
      await this.outboxService.add({
        organizationId: transfer.organizationId,
        enterpriseId: transfer.enterpriseId,
        moduleKey: 'transfers',
        eventType,
        payload,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to emit transfer event: ${message}`);
    }
  }

  private async findStockLocation(warehouseId: string, transfer: TransferRecord): Promise<string> {
    const locations = await this.locationsService.listByWarehouse({
      organizationId: transfer.organizationId,
      enterpriseId: transfer.enterpriseId,
      warehouseId,
    });
    const byUsage = locations.find((location) => location.usage === LocationUsage.STORAGE);
    if (byUsage) {
      return byUsage.id;
    }
    const byCode = locations.find(
      (location) => location.code.toUpperCase() === LOCATION_CODES.STOCK,
    );
    if (byCode) {
      return byCode.id;
    }
    throw new BadRequestException('Stock location not found for warehouse');
  }

  private async findTransitLocation(warehouseId: string, transfer: TransferRecord): Promise<string> {
    const locations = await this.locationsService.listByWarehouse({
      organizationId: transfer.organizationId,
      enterpriseId: transfer.enterpriseId,
      warehouseId,
    });
    const byUsage = locations.find((location) => location.usage === LocationUsage.TRANSIT);
    if (byUsage) {
      return byUsage.id;
    }
    const byCode = locations.find(
      (location) => location.code.toUpperCase() === LOCATION_CODES.TRANSIT,
    );
    if (byCode) {
      return byCode.id;
    }
    throw new BadRequestException('Transit location not found for warehouse');
  }

  private async getTransfer(id: string): Promise<TransferRecord> {
    const transfer = await this.transferModel.findById(id).lean<TransferDocument>().exec();
    if (!transfer) {
      throw new BadRequestException('Transfer not found');
    }
    return this.toRecord(transfer);
  }

  private toRecord(transfer: TransferDocument): TransferRecord {
    return {
      id: transfer._id.toString(),
      organizationId: transfer.organizationId,
      enterpriseId: transfer.enterpriseId,
      originWarehouseId: transfer.originWarehouseId.toString(),
      destinationWarehouseId: transfer.destinationWarehouseId.toString(),
      state: transfer.state,
      lines: transfer.lines.map((line) => ({
        lineId: line.lineId,
        productId: line.productId,
        qty: line.qty,
      })),
      createdAt: transfer.createdAt,
      updatedAt: transfer.updatedAt,
    };
  }

  private assertOrgEnterprise(organizationId: string, enterpriseId: string): void {
    if (!organizationId?.trim()) {
      throw new BadRequestException('OrganizationId is required');
    }
    if (!enterpriseId?.trim()) {
      throw new BadRequestException('EnterpriseId is required');
    }
  }
}
