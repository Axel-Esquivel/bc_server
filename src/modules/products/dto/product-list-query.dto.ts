import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ProductListQueryDto {
  @IsString()
  @IsNotEmpty()
  enterpriseId!: string;

  @IsOptional()
  @IsString()
  includeInactive?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  OrganizationId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;
}
