import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { LocationType } from '../entities/location.entity';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code!: string;

  @IsEnum(LocationType)
  type!: LocationType;

  @IsNumber()
  @IsOptional()
  capacity?: number;

  @IsString({ each: true })
  @IsOptional()
  restrictions?: string[];

  @IsString()
  @IsNotEmpty()
  OrganizationId!: string;

  @IsString()
  @IsNotEmpty()
  companyId!: string;
}
