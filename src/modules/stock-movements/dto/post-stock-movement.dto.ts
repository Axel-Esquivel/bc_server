import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsMongoId, IsNotEmpty, IsNotEmptyObject, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';
import { StockMovementType } from '../entities/stock-movement.entity';
import { StockMovementReferenceDto } from './stock-movement-reference.dto';

export class PostStockMovementDto {
  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @IsString()
  @IsNotEmpty()
  enterpriseId!: string;

  @IsEnum(StockMovementType)
  type!: StockMovementType;

  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsNumber()
  @IsPositive()
  qty!: number;

  @IsMongoId()
  @IsOptional()
  fromLocationId?: string | null;

  @IsMongoId()
  @IsOptional()
  toLocationId?: string | null;

  @IsNumber()
  @IsOptional()
  unitCost?: number;

  @IsBoolean()
  @IsOptional()
  allowNegative?: boolean;

  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => StockMovementReferenceDto)
  reference!: StockMovementReferenceDto;
}
