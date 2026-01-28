import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { CoreCurrencyInput } from '../types/core-settings.types';

export class CreateCoreCurrencyDto implements CoreCurrencyInput {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsOptional()
  symbol?: string;
}
