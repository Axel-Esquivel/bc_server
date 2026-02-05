import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateBranchDto {
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

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}
