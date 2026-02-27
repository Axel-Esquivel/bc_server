import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProviderStatus } from '../entities/provider.entity';

class ProviderVariantInput {
  @IsString()
  @IsNotEmpty()
  variantId!: string;

  @IsOptional()
  @IsNumber()
  cost?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class CreateProviderDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  nit?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  creditDays?: number;

  @IsOptional()
  @IsEnum(ProviderStatus)
  status?: ProviderStatus;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProviderVariantInput)
  variants?: ProviderVariantInput[];

  @IsOptional()
  @IsString()
  OrganizationId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsString()
  @IsNotEmpty()
  companyId!: string;
}

export { ProviderVariantInput };
