import { IsBoolean, IsMongoId, IsOptional, IsString } from 'class-validator';

export class LocationListQueryDto {
  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsString()
  @IsOptional()
  enterpriseId?: string;

  @IsMongoId()
  @IsOptional()
  warehouseId?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
