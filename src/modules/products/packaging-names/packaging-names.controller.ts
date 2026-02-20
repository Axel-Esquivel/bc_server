import { BadRequestException, Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { PackagingNamesService } from './packaging-names.service';
import { CreatePackagingNameDto } from './dto/create-packaging-name.dto';
import type { AuthenticatedRequest } from '../../../core/types/authenticated-request.types';

@Controller('packaging-names')
export class PackagingNamesController {
  constructor(private readonly packagingNamesService: PackagingNamesService) {}

  @Get()
  async list(@Query('organizationId') organizationId: string | undefined, @Req() req: AuthenticatedRequest) {
    const orgId = organizationId ?? req.user?.organizationId;
    if (!orgId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const result = await this.packagingNamesService.list(orgId);
    return { message: 'Packaging names retrieved', result };
  }

  @Post()
  async create(@Body() dto: CreatePackagingNameDto) {
    const result = await this.packagingNamesService.create(dto);
    return { message: 'Packaging name created', result };
  }
}
