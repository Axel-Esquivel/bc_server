import { IsString } from 'class-validator';

export class UpdateOrganizationModuleKeyDto {
  @IsString()
  key!: string;
}
