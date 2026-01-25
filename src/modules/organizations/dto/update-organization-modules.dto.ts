import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class UpdateOrganizationModulesDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(0)
  enabledModules!: string[];
}
