import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../../core/database/module-state.service';
import { PackagingName } from './entities/packaging-name.entity';
import { CreatePackagingNameDto } from './dto/create-packaging-name.dto';

export interface PackagingNameRecord extends PackagingName {
  id: string;
}

interface PackagingNameState {
  names: PackagingNameRecord[];
}

@Injectable()
export class PackagingNamesService implements OnModuleInit {
  private readonly logger = new Logger(PackagingNamesService.name);
  private readonly stateKey = 'module:products:packaging-names';
  private names: PackagingNameRecord[] = [];

  constructor(private readonly moduleState: ModuleStateService) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<PackagingNameState>(this.stateKey, { names: [] });
    this.names = Array.isArray(state.names) ? state.names : [];
  }

  list(organizationId: string): PackagingNameRecord[] {
    if (!organizationId) {
      return [];
    }
    const current = this.names.filter((item) => item.organizationId === organizationId);
    if (current.length === 0) {
      return this.seedDefaults(organizationId);
    }
    return current;
  }

  create(dto: CreatePackagingNameDto): PackagingNameRecord {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Packaging name is required');
    }
    const normalized = this.normalizeName(name);
    const existing = this.names.find(
      (item) => item.organizationId === dto.organizationId && item.nameNormalized === normalized,
    );
    if (existing) {
      return existing;
    }
    const record: PackagingNameRecord = {
      id: uuid(),
      organizationId: dto.organizationId,
      name,
      nameNormalized: normalized,
      isActive: true,
      sortOrder: dto.sortOrder ? Number(dto.sortOrder) : undefined,
    };
    this.names.push(record);
    this.persistState();
    return record;
  }

  private seedDefaults(organizationId: string): PackagingNameRecord[] {
    const defaults = ['Unidad', 'Paquete', 'Docena', 'Caja', 'Fardo', 'Saco', 'Bolsa', 'Rollo'];
    const created: PackagingNameRecord[] = [];
    defaults.forEach((name, index) => {
      const normalized = this.normalizeName(name);
      const exists = this.names.some(
        (item) => item.organizationId === organizationId && item.nameNormalized === normalized,
      );
      if (exists) {
        return;
      }
      const record: PackagingNameRecord = {
        id: uuid(),
        organizationId,
        name,
        nameNormalized: normalized,
        isActive: true,
        sortOrder: index + 1,
      };
      this.names.push(record);
      created.push(record);
    });
    if (created.length > 0) {
      this.persistState();
    }
    return this.names.filter((item) => item.organizationId === organizationId);
  }

  private normalizeName(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private persistState() {
    void this.moduleState
      .saveState<PackagingNameState>(this.stateKey, { names: this.names })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist packaging names: ${message}`);
      });
  }
}
