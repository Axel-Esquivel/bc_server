import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  name!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permissions!: string[];

  @IsOptional()
  @IsString()
  workspaceId?: string;
}
