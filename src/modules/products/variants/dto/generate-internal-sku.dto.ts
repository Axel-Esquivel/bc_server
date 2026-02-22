import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerateInternalSkuDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  enterpriseId?: string;

  @IsOptional()
  @IsString()
  variantId?: string;
}
