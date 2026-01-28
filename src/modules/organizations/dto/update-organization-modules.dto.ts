import { ArrayMinSize, IsArray, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateOrganizationModulesDto {
  @Transform(({ value, obj }) => {
    if (Array.isArray(value)) {
      return value;
    }
    if (Array.isArray(obj?.enabledModules)) {
      return obj.enabledModules;
    }
    return [];
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(0)
  modules!: string[];
}
