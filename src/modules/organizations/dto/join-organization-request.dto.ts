import { IsEmail, IsOptional, IsString } from 'class-validator';

export class JoinOrganizationRequestDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  roleKey?: string;
}
