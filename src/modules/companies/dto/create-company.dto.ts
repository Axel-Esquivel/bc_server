import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  legalName?: string;

  @IsString()
  @IsOptional()
  taxId?: string;

  @IsString()
  @IsNotEmpty()
  baseCountryId!: string;

  @IsString()
  @IsNotEmpty()
  baseCurrencyId!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  currencies?: string[];
}
