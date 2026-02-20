import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ProductListQueryDto {
  @IsString()
  @IsNotEmpty()
  enterpriseId!: string;

  @IsOptional()
  @IsString()
  includeInactive?: string;

  @IsOptional()
  @IsString()
  OrganizationId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;
}
