import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ClosePosSessionDto {
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

  @IsOptional()
  @IsString()
  cashierUserId?: string;

  @IsNumber()
  @Min(0)
  closingAmount!: number;
}
