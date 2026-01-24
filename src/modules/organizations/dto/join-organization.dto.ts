import { IsOptional, IsString } from 'class-validator';

export class JoinOrganizationDto {
  @IsOptional()
  @IsString()
  roleKey?: string;
}
