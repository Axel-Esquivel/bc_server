import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { JournalEntryStatus } from '../entities/journal-entry.entity';

export class JournalEntryLineDto {
  @IsString()
  @IsNotEmpty()
  accountId!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  taxRuleId?: string;

  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @IsOptional()
  debit?: number;

  @IsOptional()
  credit?: number;
}

export class CreateJournalEntryDto {
  @IsDateString()
  date!: string;

  @IsString()
  @IsNotEmpty()
  reference!: string;

  @IsOptional()
  @IsString()
  sourceModule?: string;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsEnum(JournalEntryStatus)
  status?: JournalEntryStatus;

  @ValidateNested({ each: true })
  @Type(() => JournalEntryLineDto)
  @IsArray()
  lines!: JournalEntryLineDto[];

  @IsString()
  workspaceId!: string;

  @IsString()
  companyId!: string;
}
