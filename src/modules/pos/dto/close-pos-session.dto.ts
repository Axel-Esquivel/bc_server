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

  @IsString()
  @IsNotEmpty()
  cashierUserId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  closingAmount?: number;
}
