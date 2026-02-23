import { Type } from 'class-transformer';
import { IsMongoId, IsNotEmpty, IsNotEmptyObject, IsNumber, IsPositive, IsString, ValidateNested } from 'class-validator';
import { StockReservationReferenceDto } from './stock-reservation-reference.dto';

export class ReserveStockDto {
  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @IsString()
  @IsNotEmpty()
  enterpriseId!: string;

  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsMongoId()
  locationId!: string;

  @IsNumber()
  @IsPositive()
  qty!: number;

  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => StockReservationReferenceDto)
  reference!: StockReservationReferenceDto;
}
