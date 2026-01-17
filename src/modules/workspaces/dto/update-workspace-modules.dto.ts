import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';

class WorkspaceModuleUpdateDto {
  @IsString()
  key!: string;

  @IsBoolean()
  enabled!: boolean;
}

export class UpdateWorkspaceModulesDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkspaceModuleUpdateDto)
  modules?: WorkspaceModuleUpdateDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledModules?: string[];
}
