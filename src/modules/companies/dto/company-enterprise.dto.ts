import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CompanyEnterpriseDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  countryId!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  currencyIds?: string[];

  @IsString()
  @IsOptional()
  defaultCurrencyId?: string;
}
