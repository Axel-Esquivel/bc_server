import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PosSessionDenominationDto } from './pos-session-denomination.dto';

export class ClosePosSessionDto {
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
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  cashierUserId!: string;

  @IsOptional()
  @IsString()
  posConfigId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  closingAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  countedClosingAmount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosSessionDenominationDto)
  closingDenominations?: PosSessionDenominationDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
