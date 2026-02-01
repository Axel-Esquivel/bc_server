import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

export interface ProductRecord extends Product {
  id: string;
}

interface ProductsState {
  products: ProductRecord[];
}

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);
  private readonly stateKey = 'module:products';
  private products: ProductRecord[] = [];

  constructor(private readonly moduleState: ModuleStateService) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<ProductsState>(this.stateKey, { products: [] });
    this.products = state.products ?? [];
  }

  create(dto: CreateProductDto): ProductRecord {
    const product: ProductRecord = {
      id: uuid(),
      name: dto.name,
      category: dto.category,
      purchasable: dto.purchasable ?? false,
      sellable: dto.sellable ?? true,
      trackInventory: dto.trackInventory ?? false,
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
    };

    this.products.push(product);
    this.persistState();
    return product;
  }

  findAll(): ProductRecord[] {
    return [...this.products];
  }

  findOne(id: string): ProductRecord {
    const product = this.products.find((item) => item.id === id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    this.persistState();
    return product;
  }

  update(id: string, dto: UpdateProductDto): ProductRecord {
    const product = this.findOne(id);
    Object.assign(product, {
      name: dto.name ?? product.name,
      category: dto.category ?? product.category,
      purchasable: dto.purchasable ?? product.purchasable,
      sellable: dto.sellable ?? product.sellable,
      trackInventory: dto.trackInventory ?? product.trackInventory,
      OrganizationId: dto.OrganizationId ?? product.OrganizationId,
      companyId: dto.companyId ?? product.companyId,
    });
    return product;
  }

  remove(id: string): void {
    const index = this.products.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new NotFoundException('Product not found');
    }
    this.products.splice(index, 1);
    this.persistState();
  }

  private persistState() {
    void this.moduleState
      .saveState<ProductsState>(this.stateKey, { products: this.products })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist products: ${message}`);
      });
  }
}
