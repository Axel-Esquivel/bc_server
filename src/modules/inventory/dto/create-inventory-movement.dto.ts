import { IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import type { JsonObject } from '../../../core/events/business-event';
import { InventoryDirection } from '../entities/inventory-movement.entity';

export class CreateInventoryMovementDto {
  @IsEnum(InventoryDirection)
  direction!: InventoryDirection;

  @IsString()
  @IsNotEmpty()
  variantId!: string;

  @IsString()
  @IsNotEmpty()
  warehouseId!: string;

  @IsString()
  @IsNotEmpty()
  enterpriseId!: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  operationId!: string;

  @IsOptional()
  @IsObject()
  references?: JsonObject;

  @IsString()
  @IsNotEmpty()
  OrganizationId!: string;

  @IsString()
  @IsNotEmpty()
  companyId!: string;
}
