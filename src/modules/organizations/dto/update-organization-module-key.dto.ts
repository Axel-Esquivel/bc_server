import { IsOptional, IsString } from 'class-validator';

export class UpdateOrganizationModuleKeyDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  moduleKey?: string;
}
