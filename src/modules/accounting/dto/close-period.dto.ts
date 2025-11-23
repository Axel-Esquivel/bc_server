import { IsNotEmpty, IsString } from 'class-validator';

export class ClosePeriodDto {
  @IsString()
  @IsNotEmpty()
  period!: string; // format YYYY-MM
}
