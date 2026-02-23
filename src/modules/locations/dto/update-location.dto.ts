import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { LocationType, LocationUsage } from '../entities/location.entity';

export class UpdateLocationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsEnum(LocationType)
  @IsOptional()
  type?: LocationType;

  @IsEnum(LocationUsage)
  @IsOptional()
  usage?: LocationUsage;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
