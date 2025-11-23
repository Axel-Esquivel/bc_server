import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Location } from './entities/location.entity';
import { WarehouseRecord } from './warehouses.service';

export interface LocationRecord extends Location {
  id: string;
}

@Injectable()
export class LocationsService {
  private readonly locations: LocationRecord[] = [];

  createForWarehouse(warehouse: WarehouseRecord, dto: CreateLocationDto): LocationRecord {
    if (dto.workspaceId !== warehouse.workspaceId || dto.companyId !== warehouse.companyId) {
      throw new BadRequestException('Workspace or company mismatch for location');
    }

    const duplicateCode = this.locations.some((location) => location.code === dto.code);
    if (duplicateCode) {
      throw new BadRequestException('Location code already exists');
    }

    const location: LocationRecord = {
      id: uuid(),
      warehouseId: warehouse.id,
      code: dto.code,
      type: dto.type,
      capacity: dto.capacity ?? 0,
      restrictions: dto.restrictions ?? [],
      workspaceId: warehouse.workspaceId,
      companyId: warehouse.companyId,
    };

    this.locations.push(location);
    return location;
  }

  findByWarehouse(warehouseId: string): LocationRecord[] {
    return this.locations.filter((location) => location.warehouseId === warehouseId);
  }

  findOne(id: string): LocationRecord {
    const location = this.locations.find((item) => item.id === id);
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    return location;
  }

  update(id: string, dto: UpdateLocationDto): LocationRecord {
    const location = this.findOne(id);

    if (dto.code && dto.code !== location.code) {
      const duplicate = this.locations.some((item) => item.code === dto.code);
      if (duplicate) {
        throw new BadRequestException('Location code already exists');
      }
    }

    Object.assign(location, {
      code: dto.code ?? location.code,
      type: dto.type ?? location.type,
      capacity: dto.capacity ?? location.capacity,
      restrictions: dto.restrictions ?? location.restrictions,
      workspaceId: dto.workspaceId ?? location.workspaceId,
      companyId: dto.companyId ?? location.companyId,
    });

    return location;
  }

  remove(id: string): void {
    const index = this.locations.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new NotFoundException('Location not found');
    }

    // TODO: prevent removal if stock exists once inventory storage is implemented.
    this.locations.splice(index, 1);
  }
}
