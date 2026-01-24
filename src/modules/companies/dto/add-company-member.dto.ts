import { IsNotEmpty, IsString } from 'class-validator';

export class AddCompanyMemberDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  roleKey!: string;
}
