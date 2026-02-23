import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PrepaidBalanceQueryDto {
  @IsString()
  @IsNotEmpty()
  OrganizationId!: string;

  @IsString()
  @IsNotEmpty()
  enterpriseId!: string;

  @IsOptional()
  @IsString()
  providerId?: string;
}
