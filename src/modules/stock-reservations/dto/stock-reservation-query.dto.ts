import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class StockReservationQueryDto {
  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @IsString()
  @IsNotEmpty()
  enterpriseId!: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsMongoId()
  @IsOptional()
  locationId?: string;

  @IsString()
  @IsOptional()
  status?: 'active' | 'released' | 'consumed';
}
