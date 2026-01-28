import { IsNotEmpty, IsString } from 'class-validator';
import type { CoreCountryInput } from '../types/core-settings.types';

export class CreateCoreCountryDto implements CoreCountryInput {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;
}
