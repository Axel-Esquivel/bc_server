import { IsString } from 'class-validator';

export class SetDefaultOrganizationDto {
  @IsString()
  OrganizationId!: string;
}
