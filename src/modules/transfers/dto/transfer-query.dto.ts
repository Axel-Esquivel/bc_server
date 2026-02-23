import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { TransferState } from '../entities/transfer.entity';

export class TransferQueryDto {
  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @IsString()
  @IsNotEmpty()
  enterpriseId!: string;

  @IsMongoId()
  @IsOptional()
  originWarehouseId?: string;

  @IsMongoId()
  @IsOptional()
  destinationWarehouseId?: string;

  @IsOptional()
  state?: TransferState;
}
