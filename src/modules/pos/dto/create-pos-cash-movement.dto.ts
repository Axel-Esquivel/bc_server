import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PosCashMovementType } from '../entities/pos-cash-movement.entity';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePosCashMovementDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  OrganizationId!: string;

  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @IsString()
  @IsNotEmpty()
  enterpriseId!: string;

  @IsEnum(PosCashMovementType)
  type!: PosCashMovementType;

  @IsNumber()
  amount!: number;

  @IsString()
  @IsNotEmpty()
  currencyId!: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  @IsNotEmpty()
  createdByUserId!: string;
}
