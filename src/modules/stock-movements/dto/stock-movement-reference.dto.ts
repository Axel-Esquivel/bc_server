import { IsNotEmpty, IsString } from 'class-validator';

export class StockMovementReferenceDto {
  @IsString()
  @IsNotEmpty()
  module!: string;

  @IsString()
  @IsNotEmpty()
  entity!: string;

  @IsString()
  @IsNotEmpty()
  entityId!: string;

  @IsString()
  @IsNotEmpty()
  lineId!: string;
}
