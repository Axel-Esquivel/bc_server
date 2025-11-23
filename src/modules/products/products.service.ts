import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

export interface ProductRecord extends Product {
  id: string;
}

@Injectable()
export class ProductsService {
  private readonly products: ProductRecord[] = [];

  create(dto: CreateProductDto): ProductRecord {
    const product: ProductRecord = {
      id: uuid(),
      name: dto.name,
      category: dto.category,
      purchasable: dto.purchasable ?? false,
      sellable: dto.sellable ?? true,
      trackInventory: dto.trackInventory ?? false,
      workspaceId: dto.workspaceId,
      companyId: dto.companyId,
    };

    this.products.push(product);
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
      workspaceId: dto.workspaceId ?? product.workspaceId,
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
  }
}
