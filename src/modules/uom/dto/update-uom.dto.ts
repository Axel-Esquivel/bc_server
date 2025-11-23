<<<<<<< ours
<<<<<<< ours
import { PartialType } from '@nestjs/mapped-types';
import { CreateUomDto } from './create-uom.dto';

export class UpdateUomDto extends PartialType(CreateUomDto) {}
=======
=======
>>>>>>> theirs
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateUomDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @IsOptional()
  @IsNumber()
  factor?: number;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;
}
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
