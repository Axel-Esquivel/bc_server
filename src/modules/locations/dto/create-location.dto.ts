import { IsBoolean, IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { LocationType, LocationUsage } from '../entities/location.entity';

export class CreateLocationDto {
  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsString()
  @IsOptional()
  enterpriseId?: string;

  @IsMongoId()
  @IsOptional()
  warehouseId?: string;

  @IsMongoId()
  @IsOptional()
  parentLocationId?: string | null;

  @IsString()
  @IsOptional()
  warehouseCode?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  // type: categoria funcional de la ubicacion (internal, supplier, customer, inventory_loss, transit, production).
  @IsEnum(LocationType)
  @IsOptional()
  type?: LocationType;

  // usage: proposito operativo para el frontend (storage, picking, receiving, shipping, scrap, transit, virtual).
  @IsEnum(LocationUsage)
  @IsOptional()
  usage?: LocationUsage;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
