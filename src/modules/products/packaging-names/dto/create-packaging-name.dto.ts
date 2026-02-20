import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePackagingNameDto {
  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  sortOrder?: string;
}
