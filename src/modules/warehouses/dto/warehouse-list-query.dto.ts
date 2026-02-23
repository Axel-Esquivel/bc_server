import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class WarehouseListQueryDto {
  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsString()
  @IsOptional()
  OrganizationId?: string;

  @IsString()
  @IsOptional()
  enterpriseId?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
