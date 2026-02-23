import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { InventoryAdjustmentState } from '../entities/inventory-adjustment.entity';

export class AdjustmentQueryDto {
  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @IsString()
  @IsNotEmpty()
  enterpriseId!: string;

  @IsMongoId()
  @IsOptional()
  warehouseId?: string;

  @IsMongoId()
  @IsOptional()
  locationId?: string;

  @IsOptional()
  state?: InventoryAdjustmentState;
}
