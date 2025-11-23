import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CreateUomDto } from './dto/create-uom.dto';
import { UpdateUomDto } from './dto/update-uom.dto';
import { Uom } from './entities/uom.entity';

export interface UomRecord extends Uom {
  id: string;
}

@Injectable()
export class UomService {
  private readonly uoms: UomRecord[] = [];

  create(dto: CreateUomDto): UomRecord {
    const uom: UomRecord = {
      id: uuid(),
      name: dto.name,
      code: dto.code,
      factor: dto.factor,
      workspaceId: dto.workspaceId,
      companyId: dto.companyId,
    };
    this.uoms.push(uom);
    return uom;
  }

  findAll(): UomRecord[] {
    return [...this.uoms];
  }

  findOne(id: string): UomRecord {
    const uom = this.uoms.find((item) => item.id === id);
    if (!uom) {
      throw new NotFoundException('UoM not found');
    }
    return uom;
  }

  update(id: string, dto: UpdateUomDto): UomRecord {
    const uom = this.findOne(id);
    Object.assign(uom, {
      name: dto.name ?? uom.name,
      code: dto.code ?? uom.code,
      factor: dto.factor ?? uom.factor,
      workspaceId: dto.workspaceId ?? uom.workspaceId,
      companyId: dto.companyId ?? uom.companyId,
    });
    return uom;
  }

  remove(id: string): void {
    const index = this.uoms.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new NotFoundException('UoM not found');
    }
    this.uoms.splice(index, 1);
  }
}
