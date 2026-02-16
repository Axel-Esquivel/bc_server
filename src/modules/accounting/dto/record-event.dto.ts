import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { JournalEntryLineDto } from './create-journal-entry.dto';

export class RecordAccountingEventDto {
  @IsString()
  @IsNotEmpty()
  eventType!: string;

  @IsString()
  @IsNotEmpty()
  reference!: string;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsDateString()
  date!: string;

  @ValidateNested({ each: true })
  @Type(() => JournalEntryLineDto)
  @IsArray()
  lines!: JournalEntryLineDto[];

  @IsOptional()
  @IsString()
  enterpriseId?: string;

  @IsString()
  OrganizationId!: string;

  @IsString()
  companyId!: string;
}
