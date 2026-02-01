import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CreateProviderDto, ProviderVariantInput } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { CostHistoryEntry, Provider, ProviderVariant } from './entities/provider.entity';

export interface ProviderRecord extends Provider {
  id: string;
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
    const variants = this.mapVariants(dto.variants);
    const provider: ProviderRecord = {
      id: uuid(),
      name: dto.name,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      variants,
      OrganizationId: dto.OrganizationId,
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
    if (dto.contactEmail !== undefined) provider.contactEmail = dto.contactEmail;
    if (dto.contactPhone !== undefined) provider.contactPhone = dto.contactPhone;
    if (dto.OrganizationId !== undefined) provider.OrganizationId = dto.OrganizationId;
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
}
