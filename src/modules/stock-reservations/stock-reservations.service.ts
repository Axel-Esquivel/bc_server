import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';
import type { JsonObject } from '../../core/events/business-event';
import { OutboxService } from '../outbox/outbox.service';
import { Stock, StockDocument } from '../stock/entities/stock.entity';
import { ConsumeStockDto } from './dto/consume-stock.dto';
import { ReleaseStockDto } from './dto/release-stock.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
import { StockReservationQueryDto } from './dto/stock-reservation-query.dto';
import {
  StockReservation,
  StockReservationDocument,
  StockReservationStatus,
} from './entities/stock-reservation.entity';

export interface StockReservationRecord {
  id: string;
  organizationId: string;
  enterpriseId: string;
  productId: string;
  locationId: string;
  qty: number;
  reference: {
    module: string;
    entity: string;
    entityId: string;
    lineId: string;
  };
  status: StockReservationStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

interface StockReservationEventPayload extends JsonObject {
  reservationId: string;
  enterpriseId: string;
  productId: string;
  qty: number;
  locationId: string;
  status: StockReservationStatus;
}

@Injectable()
export class StockReservationsService {
  private readonly logger = new Logger(StockReservationsService.name);

  constructor(
    @InjectModel(StockReservation.name)
    private readonly reservationModel: Model<StockReservationDocument>,
    @InjectModel(Stock.name)
    private readonly stockModel: Model<StockDocument>,
    private readonly outboxService: OutboxService,
  ) {}

  async reserve(dto: ReserveStockDto): Promise<StockReservationRecord> {
    this.assertOrgEnterprise(dto.organizationId, dto.enterpriseId);
    const existing = await this.findByReference(dto);
    if (existing) {
      if (existing.status === 'active') {
        return existing;
      }
      throw new BadRequestException('Reservation already processed');
    }

    const locationId = new MongooseSchema.Types.ObjectId(dto.locationId);
    const qty = dto.qty;

    const stockUpdate = await this.stockModel
      .updateOne(
        {
          organizationId: dto.organizationId,
          enterpriseId: dto.enterpriseId,
          productId: dto.productId,
          locationId,
          $expr: { $gte: [{ $subtract: ['$onHand', '$reserved'] }, qty] },
        },
        { $inc: { reserved: qty } },
      )
      .exec();

    if (!stockUpdate.matchedCount) {
      throw new BadRequestException('Insufficient available stock');
    }

    const created = await this.reservationModel.create({
      organizationId: dto.organizationId,
      enterpriseId: dto.enterpriseId,
      productId: dto.productId,
      locationId,
      qty,
      reference: dto.reference,
      status: 'active',
    });

    const record = this.toRecord(created);
    await this.emitEvent('StockReserved', record);
    return record;
  }

  async release(dto: ReleaseStockDto): Promise<StockReservationRecord> {
    this.assertOrgEnterprise(dto.organizationId, dto.enterpriseId);
    const existing = await this.findByReference(dto);
    if (!existing) {
      throw new BadRequestException('Reservation not found');
    }
    if (existing.status === 'released') {
      return existing;
    }
    if (existing.status === 'consumed') {
      throw new BadRequestException('Reservation already consumed');
    }

    const qty = dto.qty ?? existing.qty;
    if (qty <= 0 || qty > existing.qty) {
      throw new BadRequestException('Invalid release qty');
    }

    const updated = await this.reservationModel
      .findOneAndUpdate(
        { _id: new MongooseSchema.Types.ObjectId(existing.id), status: 'active' },
        { $set: { status: 'released' } },
        { new: true },
      )
      .lean<StockReservationDocument>()
      .exec();

    if (!updated) {
      return existing;
    }

    const stockUpdate = await this.stockModel
      .updateOne(
        {
          organizationId: dto.organizationId,
          enterpriseId: dto.enterpriseId,
          productId: dto.productId,
          locationId: new MongooseSchema.Types.ObjectId(dto.locationId),
          reserved: { $gte: qty },
        },
        { $inc: { reserved: -qty } },
      )
      .exec();

    if (!stockUpdate.matchedCount) {
      await this.reservationModel.updateOne(
        { _id: new MongooseSchema.Types.ObjectId(existing.id) },
        { $set: { status: 'active' } },
      ).exec();
      throw new BadRequestException('Failed to release reservation');
    }

    const record: StockReservationRecord = { ...existing, status: 'released' };
    await this.emitEvent('StockReservationReleased', record);
    return record;
  }

  async consume(dto: ConsumeStockDto): Promise<StockReservationRecord> {
    this.assertOrgEnterprise(dto.organizationId, dto.enterpriseId);
    const existing = await this.findByReference(dto);
    if (!existing) {
      throw new BadRequestException('Reservation not found');
    }
    if (existing.status === 'consumed') {
      return existing;
    }
    if (existing.status === 'released') {
      throw new BadRequestException('Reservation already released');
    }

    const qty = dto.qty ?? existing.qty;
    if (qty <= 0 || qty > existing.qty) {
      throw new BadRequestException('Invalid consume qty');
    }

    const updated = await this.reservationModel
      .findOneAndUpdate(
        { _id: new MongooseSchema.Types.ObjectId(existing.id), status: 'active' },
        { $set: { status: 'consumed' } },
        { new: true },
      )
      .lean<StockReservationDocument>()
      .exec();

    if (!updated) {
      return existing;
    }

    const stockUpdate = await this.stockModel
      .updateOne(
        {
          organizationId: dto.organizationId,
          enterpriseId: dto.enterpriseId,
          productId: dto.productId,
          locationId: new MongooseSchema.Types.ObjectId(dto.locationId),
          reserved: { $gte: qty },
          onHand: { $gte: qty },
        },
        { $inc: { reserved: -qty, onHand: -qty } },
      )
      .exec();

    if (!stockUpdate.matchedCount) {
      await this.reservationModel.updateOne(
        { _id: new MongooseSchema.Types.ObjectId(existing.id) },
        { $set: { status: 'active' } },
      ).exec();
      throw new BadRequestException('Failed to consume reservation');
    }

    const record: StockReservationRecord = { ...existing, status: 'consumed' };
    await this.emitEvent('StockReservationConsumed', record);
    return record;
  }

  async list(query: StockReservationQueryDto): Promise<StockReservationRecord[]> {
    this.assertOrgEnterprise(query.organizationId, query.enterpriseId);
    const filters: Record<string, unknown> = {
      organizationId: query.organizationId,
      enterpriseId: query.enterpriseId,
    };
    if (query.productId) {
      filters.productId = query.productId;
    }
    if (query.locationId) {
      filters.locationId = new MongooseSchema.Types.ObjectId(query.locationId);
    }
    if (query.status) {
      filters.status = query.status;
    }
    const reservations = await this.reservationModel
      .find(filters)
      .sort({ createdAt: -1 })
      .lean<StockReservationDocument[]>()
      .exec();
    return reservations.map((reservation) => this.toRecord(reservation));
  }

  private async emitEvent(eventType: string, reservation: StockReservationRecord): Promise<void> {
    const payload: StockReservationEventPayload = {
      reservationId: reservation.id,
      enterpriseId: reservation.enterpriseId,
      productId: reservation.productId,
      qty: reservation.qty,
      locationId: reservation.locationId,
      status: reservation.status,
    };

    try {
      await this.outboxService.add({
        organizationId: reservation.organizationId,
        enterpriseId: reservation.enterpriseId,
        moduleKey: 'stock',
        eventType,
        payload,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to emit reservation event: ${message}`);
    }
  }

  private toRecord(reservation: StockReservationDocument): StockReservationRecord {
    return {
      id: reservation._id.toString(),
      organizationId: reservation.organizationId,
      enterpriseId: reservation.enterpriseId,
      productId: reservation.productId,
      locationId: reservation.locationId.toString(),
      qty: reservation.qty,
      reference: {
        module: reservation.reference.module,
        entity: reservation.reference.entity,
        entityId: reservation.reference.entityId,
        lineId: reservation.reference.lineId,
      },
      status: reservation.status,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
    };
  }

  private async findByReference(dto: {
    organizationId: string;
    enterpriseId: string;
    productId: string;
    locationId: string;
    reference: { module: string; entity: string; entityId: string; lineId: string };
  }): Promise<StockReservationRecord | null> {
    const existing = await this.reservationModel
      .findOne({
        organizationId: dto.organizationId,
        enterpriseId: dto.enterpriseId,
        productId: dto.productId,
        locationId: new MongooseSchema.Types.ObjectId(dto.locationId),
        'reference.module': dto.reference.module,
        'reference.entity': dto.reference.entity,
        'reference.entityId': dto.reference.entityId,
        'reference.lineId': dto.reference.lineId,
      })
      .lean<StockReservationDocument>()
      .exec();
    return existing ? this.toRecord(existing) : null;
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
