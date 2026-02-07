import { IsOptional, IsString, MinLength } from 'class-validator';

export class ListOrganizationCompaniesDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  countryId?: string;
}
