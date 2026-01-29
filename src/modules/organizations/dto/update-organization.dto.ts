import { ArrayUnique, IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateOrganizationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  @IsOptional()
  countryIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  @IsOptional()
  currencyIds?: string[];
}
