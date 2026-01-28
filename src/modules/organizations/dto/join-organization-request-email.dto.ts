import { IsEmail, IsOptional, IsString } from 'class-validator';

export class JoinOrganizationRequestEmailDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  orgCode?: string;
}
