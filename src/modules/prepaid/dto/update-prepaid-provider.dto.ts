import { IsBoolean, IsOptional, IsString } from 'class-validator';

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
}
