import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PackagingNamesService } from './packaging-names.service';
import { CreatePackagingNameDto } from './dto/create-packaging-name.dto';

@Controller('packaging-names')
export class PackagingNamesController {
  constructor(private readonly packagingNamesService: PackagingNamesService) {}

  @Get()
  list(@Query('organizationId') organizationId?: string) {
    const result = organizationId ? this.packagingNamesService.list(organizationId) : [];
    return { message: 'Packaging names retrieved', result };
  }

  @Post()
  create(@Body() dto: CreatePackagingNameDto) {
    const result = this.packagingNamesService.create(dto);
    return { message: 'Packaging name created', result };
  }
}
