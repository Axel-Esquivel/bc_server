import { IsNotEmpty, IsString } from 'class-validator';

export class SetDefaultCompanyDto {
  @IsString()
  @IsNotEmpty()
  companyId!: string;
}
