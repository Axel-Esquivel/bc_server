import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CreatePriceListDto, PriceListItemDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { PriceList, PriceListItem } from './entities/price-list.entity';

export interface PriceListRecord extends PriceList {
  id: string;
}

interface PriceListsState {
  priceLists: PriceListRecord[];
}

@Injectable()
export class PriceListsService implements OnModuleInit {
  private readonly logger = new Logger(PriceListsService.name);
  private readonly stateKey = 'module:price-lists';
  private priceLists: PriceListRecord[] = [];

  constructor(private readonly moduleState: ModuleStateService) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<PriceListsState>(this.stateKey, { priceLists: [] });
    this.priceLists = state.priceLists ?? [];
  }

  create(dto: CreatePriceListDto): PriceListRecord {
    const priceList: PriceListRecord = {
      id: uuid(),
      name: dto.name,
      description: dto.description,
      items: this.mapItems(dto.items),
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
    };

    this.priceLists.push(priceList);
    this.persistState();
    return priceList;
  }

  findAll(): PriceListRecord[] {
    return [...this.priceLists];
  }

  findOne(id: string): PriceListRecord {
    const priceList = this.priceLists.find((item) => item.id === id);
    if (!priceList) {
      throw new NotFoundException('Price list not found');
    }
    return priceList;
  }

  update(id: string, dto: UpdatePriceListDto): PriceListRecord {
    const priceList = this.findOne(id);
    if (dto.name !== undefined) priceList.name = dto.name;
    if (dto.description !== undefined) priceList.description = dto.description;
    if (dto.OrganizationId !== undefined) priceList.OrganizationId = dto.OrganizationId;
    if (dto.companyId !== undefined) priceList.companyId = dto.companyId;
    if (dto.items !== undefined) {
      priceList.items = this.mapItems(dto.items);
    }
    this.persistState();
    return priceList;
  }

  remove(id: string): void {
    const index = this.priceLists.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new NotFoundException('Price list not found');
    }
    this.priceLists.splice(index, 1);
    this.persistState();
  }

  private mapItems(items: PriceListItemDto[] = []): PriceListItem[] {
    return items.map((item) => ({
      variantId: item.variantId,
      price: item.price,
      currency: item.currency ?? 'USD',
      minQuantity: item.minQuantity ?? 1,
      customerSegment: item.customerSegment,
      channel: item.channel,
      discountPercentage: item.discountPercentage,
    }));
  }

  private persistState() {
    void this.moduleState
      .saveState<PriceListsState>(this.stateKey, { priceLists: this.priceLists })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist price lists: ${message}`);
      });
  }
}
