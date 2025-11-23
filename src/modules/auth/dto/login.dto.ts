import { IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  identifier!: string; // email or username

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}
