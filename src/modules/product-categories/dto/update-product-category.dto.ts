import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateProductCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
