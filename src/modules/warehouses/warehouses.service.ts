import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { BranchesService } from '../branches/branches.service';
import { CompaniesService } from '../companies/companies.service';
import { CreateCompanyWarehouseDto } from './dto/create-company-warehouse.dto';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { Warehouse, WarehouseType } from './entities/warehouse.entity';

export interface WarehouseRecord extends Warehouse {
  id: string;
}

interface WarehousesState {
  warehouses: WarehouseRecord[];
}

@Injectable()
export class WarehousesService implements OnModuleInit {
  private readonly logger = new Logger(WarehousesService.name);
  private readonly stateKey = 'module:warehouses';
  private warehouses: WarehouseRecord[] = [];

  constructor(
    private readonly moduleState: ModuleStateService,
    private readonly companiesService: CompaniesService,
    private readonly branchesService: BranchesService,
  ) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<WarehousesState>(this.stateKey, { warehouses: [] });
    this.warehouses = state.warehouses ?? [];
  }

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
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
      branchId: dto.branchId ?? 'unknown',
    };

    this.warehouses.push(warehouse);
    this.persistState();
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
    this.persistState();
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
      OrganizationId: dto.OrganizationId ?? warehouse.OrganizationId,
      companyId: dto.companyId ?? warehouse.companyId,
      branchId: dto.branchId ?? warehouse.branchId,
    });

    return warehouse;
  }

  remove(id: string): void {
    const index = this.warehouses.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new NotFoundException('Warehouse not found');
    }
    this.warehouses.splice(index, 1);
    this.persistState();
  }

  createForCompany(companyId: string, dto: CreateCompanyWarehouseDto): WarehouseRecord {
    this.companiesService.getCompany(companyId);
    const branch = this.branchesService.findOne(dto.branchId);
    if (branch.companyId !== companyId) {
      throw new BadRequestException('Branch does not belong to the company');
    }

    const code = dto.code?.trim() || this.generateCode(dto.name);
    const type: WarehouseType = dto.type ?? WarehouseType.WAREHOUSE;

    const warehouse: WarehouseRecord = {
      id: uuid(),
      name: dto.name,
      code,
      type,
      allowNegativeStock: dto.allowNegativeStock ?? false,
      allowCountingLock: dto.allowCountingLock ?? true,
      OrganizationId: 'company',
      companyId,
      branchId: dto.branchId,
    };

    if (this.warehouses.some((item) => item.code === warehouse.code)) {
      throw new BadRequestException('Warehouse code already exists');
    }

    this.warehouses.push(warehouse);
    this.persistState();
    return warehouse;
  }

  listByCompany(companyId: string): WarehouseRecord[] {
    this.companiesService.getCompany(companyId);
    return this.warehouses.filter((warehouse) => warehouse.companyId === companyId);
  }

  private persistState() {
    void this.moduleState
      .saveState<WarehousesState>(this.stateKey, { warehouses: this.warehouses })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist warehouses: ${message}`);
      });
  }

  private generateCode(name: string): string {
    const base = name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 8);
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return base ? `${base}-${suffix}` : `WH-${suffix}`;
  }
}
