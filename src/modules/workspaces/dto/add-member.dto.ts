import { IsIn, IsOptional, IsString } from 'class-validator';

export class AddMemberDto {
  @IsString()
  userId!: string;

  @IsString()
  @IsOptional()
  @IsIn(['admin', 'member'])
  role?: 'admin' | 'member';

  @IsString()
  @IsOptional()
  roleKey?: string;
}
