import { IsArray, IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import type { BranchType } from '../entities/branch.entity';

export class CreateBranchDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  countryId!: string;

  @IsIn(['retail', 'wholesale'])
  type!: BranchType;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  currencyIds?: string[];

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}
