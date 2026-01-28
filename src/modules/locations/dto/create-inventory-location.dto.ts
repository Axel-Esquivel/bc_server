import { IsEnum, IsString, MinLength } from 'class-validator';
import { LocationType } from '../entities/inventory-location.entity';

export class CreateInventoryLocationDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEnum(LocationType)
  type!: LocationType;
}
