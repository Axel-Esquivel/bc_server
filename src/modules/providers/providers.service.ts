import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CreateProviderDto, ProviderVariantInput } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { CostHistoryEntry, Provider, ProviderStatus, ProviderVariant } from './entities/provider.entity';

export interface ProviderRecord extends Provider {
  id: string;
}

export interface ProviderVariantSummary {
  variantId: string;
  active: boolean;
  latestCost: number | null;
  latestCurrency: string | null;
  latestRecordedAt: Date | null;
}

interface ProvidersState {
  providers: ProviderRecord[];
}

@Injectable()
export class ProvidersService implements OnModuleInit {
  private readonly logger = new Logger(ProvidersService.name);
  private readonly stateKey = 'module:providers';
  private providers: ProviderRecord[] = [];

  constructor(private readonly moduleState: ModuleStateService) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<ProvidersState>(this.stateKey, { providers: [] });
    this.providers = state.providers ?? [];
  }

  create(dto: CreateProviderDto): ProviderRecord {
    const organizationId = this.resolveOrganizationId(dto.OrganizationId, dto.organizationId);
    const variants = this.mapVariants(dto.variants);
    const provider: ProviderRecord = {
      id: uuid(),
      name: dto.name,
      nit: dto.nit,
      address: dto.address,
      creditLimit: dto.creditLimit,
      creditDays: dto.creditDays,
      status: dto.status ?? ProviderStatus.ACTIVE,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      variants,
      OrganizationId: organizationId,
      companyId: dto.companyId,
    };

    this.providers.push(provider);
    this.persistState();
    return provider;
  }

  findAll(): ProviderRecord[] {
    return [...this.providers];
  }

  findOne(id: string): ProviderRecord {
    const provider = this.providers.find((item) => item.id === id);
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    this.persistState();
    return provider;
  }

  update(id: string, dto: UpdateProviderDto): ProviderRecord {
    const provider = this.findOne(id);
    if (dto.name !== undefined) provider.name = dto.name;
    if (dto.nit !== undefined) provider.nit = dto.nit;
    if (dto.address !== undefined) provider.address = dto.address;
    if (dto.creditLimit !== undefined) provider.creditLimit = dto.creditLimit;
    if (dto.creditDays !== undefined) provider.creditDays = dto.creditDays;
    if (dto.status !== undefined) provider.status = dto.status;
    if (dto.contactEmail !== undefined) provider.contactEmail = dto.contactEmail;
    if (dto.contactPhone !== undefined) provider.contactPhone = dto.contactPhone;
    if (dto.OrganizationId !== undefined || dto.organizationId !== undefined) {
      provider.OrganizationId = this.resolveOrganizationId(dto.OrganizationId, dto.organizationId);
    }
    if (dto.companyId !== undefined) provider.companyId = dto.companyId;
    if (dto.variants !== undefined) {
      provider.variants = this.mapVariants(dto.variants);
    }
    return provider;
  }

  remove(id: string): void {
    const index = this.providers.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new NotFoundException('Provider not found');
    }
    this.providers.splice(index, 1);
    this.persistState();
  }

  listVariants(id: string): ProviderVariantSummary[] {
    const provider = this.findOne(id);
    return provider.variants.map((variant) => {
      const latest = this.resolveLatestCost(variant.costHistory);
      return {
        variantId: variant.variantId,
        active: variant.active,
        latestCost: latest?.cost ?? null,
        latestCurrency: latest?.currency ?? null,
        latestRecordedAt: latest?.recordedAt ?? null,
      };
    });
  }

  private mapVariants(inputs?: ProviderVariantInput[]): ProviderVariant[] {
    if (!inputs?.length) {
      return [];
    }

    return inputs.map((variantInput) => {
      const history: CostHistoryEntry[] = [];
      if (variantInput.cost !== undefined) {
        history.push({
          variantId: variantInput.variantId,
          cost: variantInput.cost,
          currency: variantInput.currency ?? 'USD',
          recordedAt: new Date(),
        });
      }

      return {
        variantId: variantInput.variantId,
        active: true,
        costHistory: history,
      } satisfies ProviderVariant;
    });
  }

  private persistState() {
    void this.moduleState
      .saveState<ProvidersState>(this.stateKey, { providers: this.providers })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist providers: ${message}`);
      });
  }

  private resolveOrganizationId(OrganizationId?: string, organizationId?: string): string {
    const value = OrganizationId ?? organizationId;
    if (!value || !value.trim()) {
      throw new BadRequestException('OrganizationId is required');
    }
    return value.trim();
  }

  private resolveLatestCost(history: CostHistoryEntry[]): CostHistoryEntry | undefined {
    if (history.length === 0) {
      return undefined;
    }
    return history.reduce((latest, entry) => {
      if (!latest) {
        return entry;
      }
      return entry.recordedAt.getTime() >= latest.recordedAt.getTime() ? entry : latest;
    });
  }
}
