import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePrepaidVariantConfigDto {
  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  denomination?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
