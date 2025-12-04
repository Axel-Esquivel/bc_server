import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CreateUomDto } from './dto/create-uom.dto';
import { UpdateUomDto } from './dto/update-uom.dto';
import { Uom } from './entities/uom.entity';

export interface UomRecord extends Uom {
  id: string;
}

interface UomState {
  uoms: UomRecord[];
}

@Injectable()
export class UomService implements OnModuleInit {
  private readonly logger = new Logger(UomService.name);
  private readonly stateKey = 'module:uom';
  private uoms: UomRecord[] = [];

  constructor(private readonly moduleState: ModuleStateService) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<UomState>(this.stateKey, { uoms: [] });
    this.uoms = state.uoms ?? [];
  }

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
    this.persistState();
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
    this.persistState();
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
    this.persistState();
  }

  private persistState() {
    void this.moduleState
      .saveState<UomState>(this.stateKey, { uoms: this.uoms })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist units of measure: ${message}`);
      });
  }
}
