import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class UpdateEanPrefixDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{3,7}$/)
  eanPrefix!: string;
}
