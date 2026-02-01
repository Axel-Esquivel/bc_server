import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ConfirmCartDto {
  @IsString()
  @IsNotEmpty()
  OrganizationId!: string;

  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @IsString()
  @IsNotEmpty()
  terminalId!: string;

  @IsString()
  @IsOptional()
  customerId?: string;
}
