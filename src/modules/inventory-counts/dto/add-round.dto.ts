import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min, ValidateNested } from 'class-validator';

export class RoundResultDto {
  @IsString()
  @IsNotEmpty()
  lineId!: string;

  @IsNumber()
  @Min(0)
  countedQty!: number;

  @IsOptional()
  @IsString()
  countedBy?: string;

  @IsOptional()
  @IsDateString()
  countedAt?: string;

  @IsOptional()
  @IsString()
  source?: string;
}

export class AddInventoryCountRoundDto {
  @IsOptional()
  @IsPositive()
  roundNumber?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoundResultDto)
  results!: RoundResultDto[];
}
