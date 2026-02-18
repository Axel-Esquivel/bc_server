import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VariantByCodeQueryDto {
  @IsString()
  @IsNotEmpty()
  enterpriseId!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsOptional()
  @IsString()
  OrganizationId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;
}
