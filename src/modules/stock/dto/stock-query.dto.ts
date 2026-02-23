import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class StockQueryDto {
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

  @IsString()
  @IsOptional()
  productId?: string;
}
