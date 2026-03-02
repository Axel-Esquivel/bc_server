import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePackagingNameDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  multiplier?: number;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @IsOptional()
  @IsBoolean()
  variableMultiplier?: boolean;
}
