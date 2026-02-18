import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateModuleSettingsDto {
  @IsString()
  @IsNotEmpty()
  moduleKey!: string;

  @IsOptional()
  settings?: Record<string, unknown>;
}
