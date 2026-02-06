import { IsNotEmpty, IsString } from 'class-validator';

export class SetDefaultCurrencyDto {
  @IsString()
  @IsNotEmpty()
  currencyId!: string;
}
