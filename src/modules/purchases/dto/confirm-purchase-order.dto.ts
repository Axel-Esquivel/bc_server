import { IsOptional, IsString } from 'class-validator';

export class ConfirmPurchaseOrderDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  confirmedBy?: string;
}
