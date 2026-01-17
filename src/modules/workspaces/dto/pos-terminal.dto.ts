import { ArrayUnique, IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export interface PosTerminal {
  id: string;
  name: string;
  companyId: string;
  branchId: string;
  warehouseId: string;
  currencyId: string;
  allowedUsers: string[];
  isActive: boolean;
}

export interface PosTerminalDefaults {
  terminalId?: string;
}

export interface PosTerminalSettings {
  terminals: PosTerminal[];
  defaults: PosTerminalDefaults;
}

export class CreatePosTerminalDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsNotEmpty()
  warehouseId!: string;

  @IsString()
  @IsNotEmpty()
  currencyId!: string;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsOptional()
  allowedUsers?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdatePosTerminalDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsOptional()
  warehouseId?: string;

  @IsString()
  @IsOptional()
  currencyId?: string;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsOptional()
  allowedUsers?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
