import { IsNotEmpty, IsString } from 'class-validator';
import type { CoreCompanyInput } from '../types/core-settings.types';

export class CreateCoreCompanyDto implements CoreCompanyInput {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  countryId!: string;
}
