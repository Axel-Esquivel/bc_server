import { Body, Controller, Param, Patch } from '@nestjs/common';
import { ProductsService } from './products.service';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';

@Controller('organizations/:organizationId/products')
export class ProductsOrgController {
  constructor(private readonly productsService: ProductsService) {}

  @Patch(':id/status')
  setStatus(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductStatusDto,
  ) {
    const result = this.productsService.setStatus(id, dto.isActive, organizationId);
    return { message: 'Product status updated', result };
  }
}
