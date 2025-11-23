import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CreatePriceListDto, PriceListItemDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { PriceList, PriceListItem } from './entities/price-list.entity';

export interface PriceListRecord extends PriceList {
  id: string;
}

@Injectable()
export class PriceListsService {
  private readonly priceLists: PriceListRecord[] = [];

  create(dto: CreatePriceListDto): PriceListRecord {
    const priceList: PriceListRecord = {
      id: uuid(),
      name: dto.name,
      description: dto.description,
      items: this.mapItems(dto.items),
      workspaceId: dto.workspaceId,
      companyId: dto.companyId,
    };

    this.priceLists.push(priceList);
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
    if (dto.workspaceId !== undefined) priceList.workspaceId = dto.workspaceId;
    if (dto.companyId !== undefined) priceList.companyId = dto.companyId;
    if (dto.items !== undefined) {
      priceList.items = this.mapItems(dto.items);
    }
    return priceList;
  }

  remove(id: string): void {
    const index = this.priceLists.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new NotFoundException('Price list not found');
    }
    this.priceLists.splice(index, 1);
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
}
