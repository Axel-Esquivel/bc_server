import { IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { LocationType } from '../entities/location.entity';

export class UpdateLocationDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  code?: string;

  @IsEnum(LocationType)
  @IsOptional()
  type?: LocationType;

  @IsNumber()
  @IsOptional()
  capacity?: number;

  @IsString({ each: true })
  @IsOptional()
  restrictions?: string[];

  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsOptional()
  companyId?: string;
}
