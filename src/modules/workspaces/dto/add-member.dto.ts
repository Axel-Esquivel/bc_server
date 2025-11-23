import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class AddMemberDto {
  @IsString()
  userId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roles!: string[];
}
