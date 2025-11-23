import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { CreditStatus } from '../entities/credit-line.entity';

export class ConfigureCreditDto {
  @IsNumber()
  @IsPositive()
  creditLimit!: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(CreditStatus)
  @IsOptional()
  status?: CreditStatus;

  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  companyId!: string;
}
