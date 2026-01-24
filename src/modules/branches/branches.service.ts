import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CompaniesService } from '../companies/companies.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchEntity } from './entities/branch.entity';

interface BranchesState {
  branches: BranchEntity[];
}

@Injectable()
export class BranchesService implements OnModuleInit {
  private readonly logger = new Logger(BranchesService.name);
  private readonly stateKey = 'module:branches';
  private branches: BranchEntity[] = [];

  constructor(
    private readonly moduleState: ModuleStateService,
    private readonly companiesService: CompaniesService,
  ) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<BranchesState>(this.stateKey, { branches: [] });
    this.branches = (state.branches ?? []).map((branch) => this.normalizeBranch(branch));
    this.persistState();
  }

  create(companyId: string, dto: CreateBranchDto): BranchEntity {
    this.companiesService.getCompany(companyId);
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Branch name is required');
    }

    const branch: BranchEntity = {
      id: uuid(),
      companyId,
      countryId: dto.countryId,
      name,
      type: dto.type,
      currencyIds: dto.currencyIds ? Array.from(new Set(dto.currencyIds)) : undefined,
      settings: dto.settings ?? undefined,
      createdAt: new Date(),
    };

    this.branches.push(branch);
    this.persistState();
    return branch;
  }

  listByCompany(companyId: string): BranchEntity[] {
    this.companiesService.getCompany(companyId);
    return this.branches.filter((branch) => branch.companyId === companyId);
  }

  findOne(id: string): BranchEntity {
    const branch = this.branches.find((item) => item.id === id);
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    return branch;
  }

  update(id: string, dto: UpdateBranchDto): BranchEntity {
    const branch = this.findOne(id);
    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (!trimmed) {
        throw new BadRequestException('Branch name is required');
      }
      branch.name = trimmed;
    }
    if (dto.countryId !== undefined) {
      branch.countryId = dto.countryId;
    }
    if (dto.type !== undefined) {
      branch.type = dto.type;
    }
    if (dto.currencyIds !== undefined) {
      branch.currencyIds = Array.from(new Set(dto.currencyIds));
    }
    if (dto.settings !== undefined) {
      branch.settings = dto.settings ?? undefined;
    }

    this.persistState();
    return branch;
  }

  private normalizeBranch(raw: any): BranchEntity {
    const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Branch';
    const type = raw.type === 'wholesale' ? 'wholesale' : 'retail';
    return {
      id: raw.id || uuid(),
      companyId: raw.companyId || 'unknown',
      countryId: raw.countryId || 'unknown',
      name,
      type,
      currencyIds: Array.isArray(raw.currencyIds) ? raw.currencyIds : undefined,
      settings: raw.settings ?? undefined,
      createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    };
  }

  private persistState(): void {
    void this.moduleState
      .saveState<BranchesState>(this.stateKey, { branches: this.branches })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist branches: ${message}`);
      });
  }
}
