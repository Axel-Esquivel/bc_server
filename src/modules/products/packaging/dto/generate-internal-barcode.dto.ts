import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateInternalBarcodeDto {
  @IsString()
  @IsNotEmpty()
  organizationId!: string;
}
