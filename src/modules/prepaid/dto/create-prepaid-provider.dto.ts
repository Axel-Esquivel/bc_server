import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePrepaidProviderDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  @IsNotEmpty()
  OrganizationId!: string;

  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @IsString()
  @IsNotEmpty()
  enterpriseId!: string;
}
