import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsString, ValidateNested } from 'class-validator';

class WorkspaceModuleUpdateDto {
  @IsString()
  key!: string;

  @IsBoolean()
  enabled!: boolean;
}

export class UpdateWorkspaceModulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkspaceModuleUpdateDto)
  modules!: WorkspaceModuleUpdateDto[];
}
