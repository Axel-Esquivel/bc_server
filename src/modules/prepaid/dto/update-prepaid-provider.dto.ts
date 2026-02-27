import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePrepaidProviderDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  pin?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumBalance?: number;
}
