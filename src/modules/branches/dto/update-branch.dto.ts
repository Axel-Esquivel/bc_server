import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateBranchDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  countryId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  currencyIds?: string[];

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}
