import { IsArray, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import type { BranchType } from '../entities/branch.entity';

export class UpdateBranchDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  countryId?: string;

  @IsIn(['retail', 'wholesale'])
  @IsOptional()
  type?: BranchType;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  currencyIds?: string[];

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}
