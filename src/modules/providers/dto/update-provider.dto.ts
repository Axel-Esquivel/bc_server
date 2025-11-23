<<<<<<< ours
<<<<<<< ours
import { PartialType } from '@nestjs/mapped-types';
import { CreateProviderDto } from './create-provider.dto';

export class UpdateProviderDto extends PartialType(CreateProviderDto) {}
=======
=======
>>>>>>> theirs
import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ProviderVariantInput } from './create-provider.dto';

export class UpdateProviderDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProviderVariantInput)
  variants?: ProviderVariantInput[];

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
