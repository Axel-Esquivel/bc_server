import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ResolvePriceDto {
  @IsString()
  OrganizationId!: string;

  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  enterpriseId?: string;

  @IsString()
  variantId!: string;

  @IsOptional()
  @IsString()
  packagingId?: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  customerSegment?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  priceListId?: string;

  @IsOptional()
  @IsNumber()
  fallbackPrice?: number;
}
