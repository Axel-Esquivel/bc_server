import { IsEmail, IsString } from 'class-validator';

export class AddOrganizationMemberDto {
  @IsEmail()
  email!: string;

  @IsString()
  role!: string;
}
