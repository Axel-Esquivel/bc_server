import { Type } from 'class-transformer';
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
import { ProviderVariantInput } from './create-provider.dto';
import { ProviderStatus } from '../entities/provider.entity';

export class UpdateProviderDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

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

  @IsOptional()
  @IsString()
  companyId?: string;
}
