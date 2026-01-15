import { IsEmail, IsString, MinLength } from 'class-validator';

export class InitializeSetupDto {
  @IsString()
  @MinLength(2)
  dbName!: string;

  @IsString()
  @MinLength(3)
  adminName!: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(6)
  adminPassword!: string;
}
