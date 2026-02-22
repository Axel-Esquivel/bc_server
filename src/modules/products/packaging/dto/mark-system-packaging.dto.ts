import { IsNotEmpty, IsString } from 'class-validator';

export class MarkSystemPackagingDto {
  @IsString()
  @IsNotEmpty()
  organizationId!: string;
}
