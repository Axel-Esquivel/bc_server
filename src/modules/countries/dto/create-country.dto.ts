import { IsNotEmpty, IsOptional, IsString, Length, ValidateIf } from 'class-validator';

export class CreateCountryDto {
  @ValidateIf((value) => !value.iso2)
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  code?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @ValidateIf((value) => !value.code)
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  iso2?: string;

  @IsString()
  @IsOptional()
  @Length(3, 3)
  iso3?: string;

  @IsString()
  @IsOptional()
  nameEs?: string;

  @IsString()
  @IsOptional()
  nameEn?: string;

  @IsString()
  @IsOptional()
  phoneCode?: string;
}
