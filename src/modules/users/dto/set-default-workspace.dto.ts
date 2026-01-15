import { IsString } from 'class-validator';

export class SetDefaultWorkspaceDto {
  @IsString()
  workspaceId!: string;
}
