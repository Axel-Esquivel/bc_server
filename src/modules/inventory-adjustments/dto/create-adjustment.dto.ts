import { Type } from 'class-transformer';
import { IsArray, IsMongoId, IsNotEmpty, IsNumber, IsPositive, IsString, ValidateNested } from 'class-validator';

export class CreateAdjustmentLineDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsNumber()
  countedQty!: number;
}

export class CreateAdjustmentDto {
  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @IsString()
  @IsNotEmpty()
  enterpriseId!: string;

  @IsMongoId()
  warehouseId!: string;

  @IsMongoId()
  locationId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAdjustmentLineDto)
  lines!: CreateAdjustmentLineDto[];
}
