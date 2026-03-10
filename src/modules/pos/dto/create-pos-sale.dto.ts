import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePosSaleLineDto {
  @ValidateIf((item) => !item.variantId)
  @IsString()
  @IsNotEmpty()
  productId?: string;

  @ValidateIf((item) => !item.productId)
  @IsString()
  @IsNotEmpty()
  variantId?: string;

  @IsOptional()
  @IsString()
  nameSnapshot?: string;

  @IsNumber()
  @Min(0)
  qty!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsNumber()
  denomination?: number;

  @IsOptional()
  @IsString()
  prepaidProviderId?: string;
}

export class CreatePosPaymentDto {
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsNumber()
  received?: number;

  @IsOptional()
  @IsNumber()
  change?: number;
}

export class CreatePosSaleDto {
  @IsString()
  @IsNotEmpty()
  OrganizationId!: string;

  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @IsString()
  @IsNotEmpty()
  enterpriseId!: string;

  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreatePosSaleLineDto)
  lines!: CreatePosSaleLineDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePosPaymentDto)
  payments?: CreatePosPaymentDto[];
}
