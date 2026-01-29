import { ArrayUnique, IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

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
