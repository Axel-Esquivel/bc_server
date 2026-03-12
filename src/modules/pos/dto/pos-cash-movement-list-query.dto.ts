import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PosCashMovementListQueryDto {
  @IsString()
  @IsNotEmpty()
  OrganizationId!: string;

  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @IsString()
  @IsNotEmpty()
  enterpriseId!: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
