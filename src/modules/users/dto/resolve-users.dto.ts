import { IsArray, IsString } from 'class-validator';

export class ResolveUsersDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}
