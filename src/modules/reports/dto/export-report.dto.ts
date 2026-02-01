import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class ExportReportDto {
  @IsString()
  @IsIn(['sales', 'inventory-rotation', 'margin-category', 'expiry-projection'])
  reportType: 'sales' | 'inventory-rotation' | 'margin-category' | 'expiry-projection';

  @IsObject()
  @IsNotEmpty()
  payload: Record<string, any>;

  @IsOptional()
  @IsString()
  OrganizationId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;
}
