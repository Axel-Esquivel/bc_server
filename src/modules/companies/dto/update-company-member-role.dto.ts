import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateCompanyMemberRoleDto {
  @IsString()
  @IsNotEmpty()
  roleKey!: string;
}
