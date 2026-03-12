import { ArrayNotEmpty, IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePosConfigDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

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
  warehouseId!: string;

  @IsString()
  @IsNotEmpty()
  currencyId!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(PaymentMethod, { each: true })
  allowedPaymentMethods!: PaymentMethod[];

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  allowedUserIds!: string[];

  @IsOptional()
  @IsBoolean()
  requiresOpening?: boolean;

  @IsOptional()
  @IsBoolean()
  allowOtherUsersClose?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
