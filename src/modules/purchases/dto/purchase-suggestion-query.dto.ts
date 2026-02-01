import { IsNumber, IsOptional, IsString } from 'class-validator';

export class PurchaseSuggestionQueryDto {
  @IsString()
  OrganizationId!: string;

  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsNumber()
  minOnHand?: number;

  @IsOptional()
  @IsNumber()
  targetOnHand?: number;
}
