import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateUomDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsNumber()
  factor!: number;

  @IsOptional()
  @IsBoolean()
  isBase?: boolean;

  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
