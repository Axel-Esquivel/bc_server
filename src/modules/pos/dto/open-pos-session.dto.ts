import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class OpenPosSessionDto {
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
  cashierUserId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  openingAmount?: number;
}
