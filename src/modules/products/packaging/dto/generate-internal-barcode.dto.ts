import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerateInternalBarcodeDto {
  @IsString()
  @IsNotEmpty()
  organizationId?: string;

  @IsOptional()
  @IsString()
  packagingId?: string;
}
