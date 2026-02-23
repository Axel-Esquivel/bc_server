import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreatePrepaidVariantConfigDto {
  @IsOptional()
  @IsString()
  variantId?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @IsString()
  @IsNotEmpty()
  providerId!: string;

  @IsNumber()
  @Min(0)
  denomination!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  requestCodeTemplate!: string;

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
