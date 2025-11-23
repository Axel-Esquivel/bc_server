import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { Warehouse } from './entities/warehouse.entity';

export interface WarehouseRecord extends Warehouse {
  id: string;
}

@Injectable()
export class WarehousesService {
  private readonly warehouses: WarehouseRecord[] = [];

  create(dto: CreateWarehouseDto): WarehouseRecord {
    const exists = this.warehouses.some((warehouse) => warehouse.code === dto.code);
    if (exists) {
      throw new BadRequestException('Warehouse code already exists');
    }

    const warehouse: WarehouseRecord = {
      id: uuid(),
      name: dto.name,
      code: dto.code,
      type: dto.type,
      allowNegativeStock: dto.allowNegativeStock ?? false,
      allowCountingLock: dto.allowCountingLock ?? true,
      workspaceId: dto.workspaceId,
      companyId: dto.companyId,
    };

    this.warehouses.push(warehouse);
    return warehouse;
  }

  findAll(): WarehouseRecord[] {
    return [...this.warehouses];
  }

  findOne(id: string): WarehouseRecord {
    const warehouse = this.warehouses.find((item) => item.id === id);
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }
    return warehouse;
  }

  update(id: string, dto: UpdateWarehouseDto): WarehouseRecord {
    const warehouse = this.findOne(id);

    if (dto.code && dto.code !== warehouse.code) {
      const duplicated = this.warehouses.some((item) => item.code === dto.code);
      if (duplicated) {
        throw new BadRequestException('Warehouse code already exists');
      }
    }

    Object.assign(warehouse, {
      name: dto.name ?? warehouse.name,
      code: dto.code ?? warehouse.code,
      type: dto.type ?? warehouse.type,
      allowNegativeStock: dto.allowNegativeStock ?? warehouse.allowNegativeStock,
      allowCountingLock: dto.allowCountingLock ?? warehouse.allowCountingLock,
      workspaceId: dto.workspaceId ?? warehouse.workspaceId,
      companyId: dto.companyId ?? warehouse.companyId,
    });

    return warehouse;
  }

  remove(id: string): void {
    const index = this.warehouses.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new NotFoundException('Warehouse not found');
    }
    this.warehouses.splice(index, 1);
  }
}
