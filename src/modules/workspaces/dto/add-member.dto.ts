import { IsIn, IsString } from 'class-validator';

export class AddMemberDto {
  @IsString()
  userId!: string;

  @IsString()
  @IsIn(['admin', 'member'])
  role!: 'admin' | 'member';
}
