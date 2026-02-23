import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../core/types/authenticated-request.types';
import { CreateLocationDto } from './dto/create-location.dto';
import { LocationListQueryDto } from './dto/location-list-query.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  async list(@Query() query: LocationListQueryDto, @Req() req: AuthenticatedRequest) {
    const organizationId = query.organizationId ?? req.user?.organizationId ?? undefined;
    const enterpriseId = query.enterpriseId ?? req.user?.enterpriseId ?? undefined;
    const result = await this.locationsService.listByWarehouse({
      ...query,
      organizationId,
      enterpriseId,
    });
    return { message: 'Locations retrieved', result };
  }

  @Post()
  async create(@Body() dto: CreateLocationDto, @Req() req: AuthenticatedRequest) {
    const organizationId = dto.organizationId ?? req.user?.organizationId ?? undefined;
    const enterpriseId = dto.enterpriseId ?? req.user?.enterpriseId ?? undefined;
    const result = await this.locationsService.create({
      ...dto,
      organizationId,
      enterpriseId,
    });
    return { message: 'Location created', result };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.locationsService.findOne(id);
    return { message: 'Location retrieved', result };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
    const result = await this.locationsService.update(id, dto);
    return { message: 'Location updated', result };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.locationsService.remove(id);
    return { message: 'Location deleted', result: { id } };
  }
}
