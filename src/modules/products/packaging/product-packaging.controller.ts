import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreatePackagingDto } from './dto/create-packaging.dto';
import { UpdatePackagingDto } from './dto/update-packaging.dto';
import { ProductPackagingService } from './product-packaging.service';

@Controller('products')
export class ProductPackagingController {
  constructor(private readonly packagingService: ProductPackagingService) {}

  @Get(':variantId/packaging')
  list(@Param('variantId') variantId: string) {
    const result = this.packagingService.listByVariant(variantId);
    return { message: 'Packaging retrieved', result };
  }

  @Post(':variantId/packaging')
  create(@Param('variantId') variantId: string, @Body() dto: CreatePackagingDto) {
    const payload: CreatePackagingDto = { ...dto, variantId };
    const result = this.packagingService.create(payload);
    return { message: 'Packaging created', result };
  }

  @Patch('packaging/:id')
  update(@Param('id') id: string, @Body() dto: UpdatePackagingDto) {
    const result = this.packagingService.update(id, dto);
    return { message: 'Packaging updated', result };
  }

  @Delete('packaging/:id')
  remove(@Param('id') id: string) {
    const result = this.packagingService.softDelete(id);
    return { message: 'Packaging removed', result };
  }
}
