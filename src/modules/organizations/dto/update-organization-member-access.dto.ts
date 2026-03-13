import { IsIn, IsString } from 'class-validator';

export class UpdateOrganizationMemberAccessDto {
  @IsString()
  @IsIn(['active', 'disabled'])
  status!: 'active' | 'disabled';
}
