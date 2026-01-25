import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateCountryDto {
  @IsString()
  @IsOptional()
  @Length(2, 2)
  iso2?: string;

  @IsString()
  @IsOptional()
  @Length(3, 3)
  iso3?: string;

  @IsString()
  @IsOptional()
  @Length(2, 2)
  code?: string;

  @IsString()
  @IsOptional()
  name?: string;

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
