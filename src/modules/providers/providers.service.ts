import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CreateProviderDto, ProviderVariantInput } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { CostHistoryEntry, Provider, ProviderVariant } from './entities/provider.entity';

export interface ProviderRecord extends Provider {
  id: string;
}

@Injectable()
export class ProvidersService {
  private readonly providers: ProviderRecord[] = [];

  create(dto: CreateProviderDto): ProviderRecord {
    const variants = this.mapVariants(dto.variants);
    const provider: ProviderRecord = {
      id: uuid(),
      name: dto.name,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      variants,
      workspaceId: dto.workspaceId,
      companyId: dto.companyId,
    };

    this.providers.push(provider);
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
    return provider;
  }

  update(id: string, dto: UpdateProviderDto): ProviderRecord {
    const provider = this.findOne(id);
    if (dto.name !== undefined) provider.name = dto.name;
    if (dto.contactEmail !== undefined) provider.contactEmail = dto.contactEmail;
    if (dto.contactPhone !== undefined) provider.contactPhone = dto.contactPhone;
    if (dto.workspaceId !== undefined) provider.workspaceId = dto.workspaceId;
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
}
