import { IsEmail, IsString } from 'class-validator';

export class InviteOrganizationMemberDto {
  @IsEmail()
  email!: string;

  @IsString()
  roleKey!: string;
}
