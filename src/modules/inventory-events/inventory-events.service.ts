import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { JsonObject, JsonValue } from '../../core/events/business-event';
import { LocationsService } from '../locations/locations.service';
import { LocationUsage } from '../locations/entities/location.entity';
import { OutboxService } from '../outbox/outbox.service';
import { PostStockMovementDto } from '../stock-movements/dto/post-stock-movement.dto';
import { StockMovementType } from '../stock-movements/entities/stock-movement.entity';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { LOCATION_CODES } from '../locations/locations.service';
import {
  InventoryEventReference,
  InventoryInboundEventPayloadBase,
  InventoryInboundEventType,
} from './inventory-events.types';

const SUPPORTED_EVENT_TYPES: InventoryInboundEventType[] = [
  'PurchaseReceived',
  'PosTicketClosed',
  'SaleConfirmed',
  'TransferDispatched',
  'TransferReceived',
];

@Injectable()
export class InventoryEventsService {
  private readonly logger = new Logger(InventoryEventsService.name);

  constructor(
    private readonly outboxService: OutboxService,
    private readonly locationsService: LocationsService,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  async consumePending(limit = 50): Promise<{ processed: number; failed: number }> {
    const events = await this.outboxService.fetchPendingByEventTypes(SUPPORTED_EVENT_TYPES, limit);
    let processed = 0;
    let failed = 0;

    for (const event of events) {
      try {
        await this.handleEvent(event.eventType as InventoryInboundEventType, event.payload);
        await this.outboxService.markProcessed(event.id);
        processed += 1;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to consume inventory event ${event.eventType}: ${message}`);
        await this.outboxService.markFailed(event.id);
      }
    }

    return { processed, failed };
  }

  private async handleEvent(eventType: InventoryInboundEventType, payload: JsonObject): Promise<void> {
    const base = this.parseBasePayload(payload);
    let movement: PostStockMovementDto;

    switch (eventType) {
      case 'PurchaseReceived':
        movement = await this.mapPurchaseReceived(base);
        break;
      case 'PosTicketClosed':
      case 'SaleConfirmed':
        movement = await this.mapSaleConfirmed(base);
        break;
      case 'TransferDispatched':
        movement = await this.mapTransferDispatched(base);
        break;
      case 'TransferReceived':
        movement = await this.mapTransferReceived(base);
        break;
      default:
        throw new BadRequestException(`Unsupported inventory event: ${eventType}`);
    }

    await this.stockMovementsService.postMovement(movement);
  }

  private async mapPurchaseReceived(payload: InventoryInboundEventPayloadBase): Promise<PostStockMovementDto> {
    const toLocationId = await this.resolveLocation({
      organizationId: payload.organizationId,
      enterpriseId: payload.enterpriseId,
      warehouseId: payload.warehouseId,
      locationId: payload.toLocationId,
      locationCode: payload.toLocationCode,
      locationUsage: payload.toLocationUsage,
      fallbackCodes: [LOCATION_CODES.RECEIVING, LOCATION_CODES.STOCK],
      fallbackUsages: [LocationUsage.RECEIVING, LocationUsage.STORAGE],
      errorMessage: 'PurchaseReceived requires a destination location',
    });

    return {
      organizationId: payload.organizationId,
      enterpriseId: payload.enterpriseId,
      type: StockMovementType.IN,
      productId: payload.productId,
      qty: payload.qty,
      toLocationId,
      unitCost: payload.unitCost ?? 0,
      allowNegative: false,
      reference: payload.reference,
    };
  }

  private async mapSaleConfirmed(payload: InventoryInboundEventPayloadBase): Promise<PostStockMovementDto> {
    const fromLocationId = await this.resolveLocation({
      organizationId: payload.organizationId,
      enterpriseId: payload.enterpriseId,
      warehouseId: payload.warehouseId,
      locationId: payload.fromLocationId,
      locationCode: payload.fromLocationCode,
      locationUsage: payload.fromLocationUsage,
      fallbackCodes: [LOCATION_CODES.STOCK],
      fallbackUsages: [LocationUsage.PICKING, LocationUsage.SHIPPING, LocationUsage.STORAGE],
      errorMessage: 'Sale event requires a source location',
    });

    return {
      organizationId: payload.organizationId,
      enterpriseId: payload.enterpriseId,
      type: StockMovementType.OUT,
      productId: payload.productId,
      qty: payload.qty,
      fromLocationId,
      unitCost: payload.unitCost ?? 0,
      allowNegative: false,
      reference: payload.reference,
    };
  }

  private async mapTransferDispatched(payload: InventoryInboundEventPayloadBase): Promise<PostStockMovementDto> {
    const fromLocationId = await this.resolveLocation({
      organizationId: payload.organizationId,
      enterpriseId: payload.enterpriseId,
      warehouseId: payload.warehouseId,
      locationId: payload.fromLocationId,
      locationCode: payload.fromLocationCode,
      locationUsage: payload.fromLocationUsage,
      fallbackCodes: [LOCATION_CODES.STOCK],
      fallbackUsages: [LocationUsage.STORAGE],
      errorMessage: 'TransferDispatched requires a source location',
    });
    const toLocationId = await this.resolveLocation({
      organizationId: payload.organizationId,
      enterpriseId: payload.enterpriseId,
      warehouseId: payload.warehouseId,
      locationId: payload.toLocationId,
      locationCode: payload.toLocationCode,
      locationUsage: payload.toLocationUsage,
      fallbackCodes: [LOCATION_CODES.TRANSIT],
      fallbackUsages: [LocationUsage.TRANSIT],
      errorMessage: 'TransferDispatched requires a transit location',
    });

    return {
      organizationId: payload.organizationId,
      enterpriseId: payload.enterpriseId,
      type: StockMovementType.INTERNAL,
      productId: payload.productId,
      qty: payload.qty,
      fromLocationId,
      toLocationId,
      unitCost: payload.unitCost ?? 0,
      allowNegative: false,
      reference: payload.reference,
    };
  }

  private async mapTransferReceived(payload: InventoryInboundEventPayloadBase): Promise<PostStockMovementDto> {
    const fromLocationId = await this.resolveLocation({
      organizationId: payload.organizationId,
      enterpriseId: payload.enterpriseId,
      warehouseId: payload.warehouseId,
      locationId: payload.fromLocationId,
      locationCode: payload.fromLocationCode,
      locationUsage: payload.fromLocationUsage,
      fallbackCodes: [LOCATION_CODES.TRANSIT],
      fallbackUsages: [LocationUsage.TRANSIT],
      errorMessage: 'TransferReceived requires a transit source location',
    });
    const toLocationId = await this.resolveLocation({
      organizationId: payload.organizationId,
      enterpriseId: payload.enterpriseId,
      warehouseId: payload.warehouseId,
      locationId: payload.toLocationId,
      locationCode: payload.toLocationCode,
      locationUsage: payload.toLocationUsage,
      fallbackCodes: [LOCATION_CODES.STOCK],
      fallbackUsages: [LocationUsage.STORAGE],
      errorMessage: 'TransferReceived requires a destination location',
    });

    return {
      organizationId: payload.organizationId,
      enterpriseId: payload.enterpriseId,
      type: StockMovementType.INTERNAL,
      productId: payload.productId,
      qty: payload.qty,
      fromLocationId,
      toLocationId,
      unitCost: payload.unitCost ?? 0,
      allowNegative: false,
      reference: payload.reference,
    };
  }

  private parseBasePayload(payload: JsonObject): InventoryInboundEventPayloadBase {
    const organizationId = this.readString(payload, 'organizationId', true);
    const enterpriseId = this.readString(payload, 'enterpriseId', true);
    const productId = this.readString(payload, 'productId', true);
    const qty = this.readNumber(payload, 'qty', true);
    const unitCost = this.readNumber(payload, 'unitCost', false);
    const warehouseId = this.readString(payload, 'warehouseId', false);
    const fromLocationId = this.readString(payload, 'fromLocationId', false);
    const toLocationId = this.readString(payload, 'toLocationId', false);
    const fromLocationCode = this.readString(payload, 'fromLocationCode', false);
    const toLocationCode = this.readString(payload, 'toLocationCode', false);
    const fromLocationUsage = this.readUsage(payload, 'fromLocationUsage');
    const toLocationUsage = this.readUsage(payload, 'toLocationUsage');
    const reference = this.readReference(payload);

    if (!organizationId || !enterpriseId || !productId || qty === null) {
      throw new BadRequestException('Invalid inventory event payload');
    }

    return {
      organizationId,
      enterpriseId,
      productId,
      qty,
      unitCost: unitCost ?? undefined,
      warehouseId: warehouseId ?? undefined,
      fromLocationId: fromLocationId ?? undefined,
      toLocationId: toLocationId ?? undefined,
      fromLocationCode: fromLocationCode ?? undefined,
      toLocationCode: toLocationCode ?? undefined,
      fromLocationUsage: fromLocationUsage ?? undefined,
      toLocationUsage: toLocationUsage ?? undefined,
      reference,
    };
  }

  private async resolveLocation(input: {
    organizationId: string;
    enterpriseId: string;
    warehouseId?: string;
    locationId?: string | null;
    locationCode?: string | null;
    locationUsage?: LocationUsage | null;
    fallbackCodes: string[];
    fallbackUsages: LocationUsage[];
    errorMessage: string;
  }): Promise<string> {
    if (input.locationId) {
      return input.locationId;
    }
    if (!input.warehouseId) {
      throw new BadRequestException(input.errorMessage);
    }

    const locations = await this.locationsService.listByWarehouse({
      organizationId: input.organizationId,
      enterpriseId: input.enterpriseId,
      warehouseId: input.warehouseId,
    });

    const byCode = (code: string) =>
      locations.find((location) => location.code.toUpperCase() === code.toUpperCase());
    const byUsage = (usage: LocationUsage) =>
      locations.find((location) => location.usage === usage);

    if (input.locationCode) {
      const found = byCode(input.locationCode);
      if (found) {
        return found.id;
      }
    }

    if (input.locationUsage) {
      const found = byUsage(input.locationUsage);
      if (found) {
        return found.id;
      }
    }

    for (const usage of input.fallbackUsages) {
      const found = byUsage(usage);
      if (found) {
        return found.id;
      }
    }

    for (const code of input.fallbackCodes) {
      const found = byCode(code);
      if (found) {
        return found.id;
      }
    }

    throw new BadRequestException(input.errorMessage);
  }

  private readString(payload: JsonObject, key: string, required: boolean): string | null {
    const value = payload[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
    if (required) {
      return null;
    }
    return null;
  }

  private readNumber(payload: JsonObject, key: string, required: boolean): number | null {
    const value = payload[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (required) {
      return null;
    }
    return null;
  }

  private readUsage(payload: JsonObject, key: string): LocationUsage | null {
    const value = payload[key];
    if (typeof value === 'string') {
      if (Object.values(LocationUsage).includes(value as LocationUsage)) {
        return value as LocationUsage;
      }
    }
    return null;
  }

  private readReference(payload: JsonObject): InventoryEventReference {
    const raw = payload.reference;
    if (!this.isJsonObject(raw)) {
      throw new BadRequestException('Event reference is required');
    }
    const module = this.readString(raw, 'module', true);
    const entity = this.readString(raw, 'entity', true);
    const entityId = this.readString(raw, 'entityId', true);
    const lineId = this.readString(raw, 'lineId', true);
    if (!module || !entity || !entityId || !lineId) {
      throw new BadRequestException('Event reference is invalid');
    }
    return { module, entity, entityId, lineId };
  }

  private isJsonObject(value: JsonValue): value is JsonObject {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }
}
