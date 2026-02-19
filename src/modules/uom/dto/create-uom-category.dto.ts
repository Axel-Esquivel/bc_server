import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUomCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
