import { Injectable } from '@nestjs/common';

import { PriceListsService } from '../../price-lists/price-lists.service';
import { OrganizationsService } from '../../organizations/organizations.service';
import { OrganizationModuleStatus, OrganizationModuleState } from '../../organizations/types/module-state.types';
import { ProductPackagingService } from '../packaging/product-packaging.service';
import { PriceListRecord } from '../../price-lists/price-lists.service';
import { PriceListItem } from '../../price-lists/entities/price-list.entity';

export interface ResolvePriceParams {
  OrganizationId: string;
  companyId: string;
  enterpriseId?: string;
  variantId: string;
  packagingId?: string;
  quantity?: number;
  customerSegment?: string;
  channel?: string;
  priceListId?: string;
  fallbackPrice?: number;
}

export interface ResolvedPrice {
  unitPrice: number;
  currency?: string;
  source: 'price_list' | 'packaging' | 'fallback';
}

@Injectable()
export class PriceResolverService {
  constructor(
    private readonly priceListsService: PriceListsService,
    private readonly organizationsService: OrganizationsService,
    private readonly packagingService: ProductPackagingService,
  ) {}

  async resolvePrice(params: ResolvePriceParams): Promise<ResolvedPrice> {
    const quantity = params.quantity ?? 1;
    const packagingPrice = await this.resolvePackagingPrice(params);

    const priceListsInstalled = await this.isPriceListsInstalled(params.OrganizationId);
    if (!priceListsInstalled) {
      return this.buildResult(packagingPrice, params.fallbackPrice);
    }

    const priceListItem =
      this.findBestPriceListItem(params, quantity, params.packagingId?.trim() || undefined) ??
      this.findBestPriceListItem(params, quantity, undefined);

    if (priceListItem) {
      return {
        unitPrice: priceListItem.price,
        currency: priceListItem.currency,
        source: 'price_list',
      };
    }

    return this.buildResult(packagingPrice, params.fallbackPrice);
  }

  private async resolvePackagingPrice(
    params: ResolvePriceParams,
  ): Promise<number | null> {
    const variantId = params.variantId?.trim();
    if (!variantId || !params.OrganizationId) {
      return null;
    }

    const packagingId = params.packagingId?.trim();
    if (packagingId) {
      const list = await this.packagingService.listByVariant(variantId, params.OrganizationId);
      const match = list.find((item) => item.id === packagingId && item.isActive);
      if (match && typeof match.price === 'number') {
        return match.price;
      }
    }

    const fallbackPackaging = await this.packagingService.findDefaultByVariant(
      variantId,
      params.OrganizationId,
    );
    if (fallbackPackaging && typeof fallbackPackaging.price === 'number') {
      return fallbackPackaging.price;
    }

    return null;
  }

  private findBestPriceListItem(
    params: ResolvePriceParams,
    quantity: number,
    packagingId?: string,
  ): PriceListItem | null {
    const priceLists = this.listPriceListsForTenant(
      params.OrganizationId,
      params.companyId,
      params.priceListId,
    );
    const candidates: PriceListItem[] = [];

    priceLists.forEach((list) => {
      list.items.forEach((item) => {
        if (item.variantId !== params.variantId) {
          return;
        }
        const itemPackagingId = item.packagingId?.trim() || undefined;
        if (packagingId) {
          if (itemPackagingId !== packagingId) {
            return;
          }
        } else if (itemPackagingId) {
          return;
        }

        if (!this.matchesSegment(item.customerSegment, params.customerSegment)) {
          return;
        }
        if (!this.matchesSegment(item.channel, params.channel)) {
          return;
        }

        const minQty = item.minQuantity ?? 1;
        if (minQty > quantity) {
          return;
        }
        candidates.push(item);
      });
    });

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => (b.minQuantity ?? 1) - (a.minQuantity ?? 1));
    return candidates[0];
  }

  private listPriceListsForTenant(
    OrganizationId: string,
    companyId: string,
    priceListId?: string,
  ): PriceListRecord[] {
    const listId = priceListId?.trim();
    return this.priceListsService
      .findAll()
      .filter((list) => list.OrganizationId === OrganizationId && list.companyId === companyId)
      .filter((list) => (!listId ? true : list.id === listId));
  }

  private matchesSegment(itemValue?: string, requested?: string): boolean {
    const normalizedItem = itemValue?.trim();
    const normalizedRequest = requested?.trim();
    if (!normalizedItem) {
      return true;
    }
    if (!normalizedRequest) {
      return false;
    }
    return normalizedItem === normalizedRequest;
  }

  private async isPriceListsInstalled(OrganizationId: string): Promise<boolean> {
    const organization = await this.organizationsService.getOrganization(OrganizationId);
    const installed = organization.installedModules?.some((module) => module.key === 'price-lists');
    if (installed) {
      return true;
    }
    const state = (organization.moduleStates?.['price-lists'] ?? null) as OrganizationModuleState | null;
    return Boolean(state && state.status !== OrganizationModuleStatus.Disabled);
  }

  private buildResult(packagingPrice: number | null, fallbackPrice?: number): ResolvedPrice {
    if (packagingPrice !== null && packagingPrice !== undefined) {
      return {
        unitPrice: packagingPrice,
        source: 'packaging',
      };
    }
    return {
      unitPrice: fallbackPrice ?? 0,
      source: 'fallback',
    };
  }
}
