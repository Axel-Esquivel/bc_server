import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export type InventoryCostMethod = 'weighted_avg' | 'fifo' | 'standard';
export type InventoryStockLevel = 'warehouse' | 'location';

export interface InventorySettings {
  costMethod: InventoryCostMethod;
  stockLevel: InventoryStockLevel;
  allowNegative: boolean;
}

export class UpdateInventorySettingsDto {
  @IsIn(['weighted_avg', 'fifo', 'standard'])
  @IsOptional()
  costMethod?: InventoryCostMethod;

  @IsIn(['warehouse', 'location'])
  @IsOptional()
  stockLevel?: InventoryStockLevel;

  @IsBoolean()
  @IsOptional()
  allowNegative?: boolean;
}
