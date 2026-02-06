import { IsNotEmpty, IsString } from 'class-validator';

export class SetDefaultEnterpriseDto {
  @IsString()
  @IsNotEmpty()
  enterpriseId!: string;
}
