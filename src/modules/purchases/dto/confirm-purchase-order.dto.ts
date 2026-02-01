import { IsOptional, IsString } from 'class-validator';

export class ConfirmPurchaseOrderDto {
  @IsString()
  OrganizationId!: string;

  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  confirmedBy?: string;
}
