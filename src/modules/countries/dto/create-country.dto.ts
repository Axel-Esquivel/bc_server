import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateCountryDto {
  @IsString()
  @Length(2, 2)
  iso2!: string;

  @IsString()
  @Length(3, 3)
  iso3!: string;

  @IsString()
  @IsNotEmpty()
  nameEs!: string;

  @IsString()
  @IsNotEmpty()
  nameEn!: string;

  @IsString()
  @IsOptional()
  phoneCode?: string;
}
