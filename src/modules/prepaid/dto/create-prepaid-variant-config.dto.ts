import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePrepaidVariantConfigDto {
  @IsString()
  @IsNotEmpty()
  variantId!: string;

  @IsString()
  @IsNotEmpty()
  providerId!: string;

  @IsNumber()
  @Min(0)
  denomination!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  @IsNotEmpty()
  OrganizationId!: string;

  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @IsString()
  @IsNotEmpty()
  enterpriseId!: string;
}
