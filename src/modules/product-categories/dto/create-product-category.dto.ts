import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProductCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
