import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ConfirmCartDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

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
