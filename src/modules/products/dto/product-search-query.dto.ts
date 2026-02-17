import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ProductSearchQueryDto {
  @IsString()
  @IsNotEmpty()
  enterpriseId!: string;

  @IsString()
  @IsNotEmpty()
  q!: string;

  @IsOptional()
  @IsString()
  OrganizationId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;
}
