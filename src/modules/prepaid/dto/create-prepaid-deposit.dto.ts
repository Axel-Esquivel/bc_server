import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePrepaidDepositDto {
  @IsString()
  @IsNotEmpty()
  providerId!: string;

  @IsNumber()
  @Min(0)
  depositAmount!: number;

  @IsNumber()
  @Min(0)
  creditedAmount!: number;

  @IsOptional()
  @IsString()
  reference?: string;

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
