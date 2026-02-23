import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePrepaidConsumptionDto {
  @IsString()
  @IsNotEmpty()
  providerId!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  saleId?: string;

  @IsOptional()
  @IsString()
  saleLineId?: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsNumber()
  denomination?: number;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

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
