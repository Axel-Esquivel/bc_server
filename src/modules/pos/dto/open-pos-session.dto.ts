import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PosSessionDenominationDto } from './pos-session-denomination.dto';

export class OpenPosSessionDto {
  @IsString()
  @IsNotEmpty()
  posConfigId!: string;

  @IsString()
  @IsNotEmpty()
  OrganizationId!: string;

  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @IsString()
  @IsNotEmpty()
  enterpriseId!: string;

  @IsString()
  @IsNotEmpty()
  warehouseId!: string;

  @IsString()
  @IsNotEmpty()
  cashierUserId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  openingAmount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosSessionDenominationDto)
  openingDenominations?: PosSessionDenominationDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
