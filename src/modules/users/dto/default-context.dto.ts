import { IsOptional, IsString } from 'class-validator';

export class DefaultContextDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  countryId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  enterpriseId?: string;

  @IsOptional()
  @IsString()
  currencyId?: string;
}
