import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class InventoryCountDecisionDto {
  @IsString()
  @IsNotEmpty()
  lineId!: string;

  @IsNumber()
  @Min(0)
  finalQty!: number;

  @IsOptional()
  @IsString()
  decisionBy?: string;

  @IsOptional()
  @IsDateString()
  decisionAt?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReviewInventoryCountDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryCountDecisionDto)
  decisions!: InventoryCountDecisionDto[];
}
