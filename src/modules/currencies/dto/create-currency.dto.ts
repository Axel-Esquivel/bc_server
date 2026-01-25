import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateCurrencyDto {
  @IsString()
  @Length(2, 6)
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  symbol?: string;
}
