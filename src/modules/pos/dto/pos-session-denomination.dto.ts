import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { PosDenominationType } from '../entities/pos-session-denomination.entity';

export class PosSessionDenominationDto {
  @IsString()
  @IsNotEmpty()
  currencyId!: string;

  @IsNumber()
  @Min(0.01)
  denominationValue!: number;

  @IsEnum(PosDenominationType)
  denominationType!: PosDenominationType;

  @IsInt()
  @Min(0)
  quantity!: number;
}
