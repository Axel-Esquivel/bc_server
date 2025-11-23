import { IsString } from 'class-validator';

export class BlockDeviceDto {
  @IsString()
  deviceId!: string;
}
