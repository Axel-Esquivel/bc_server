import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateUomCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
