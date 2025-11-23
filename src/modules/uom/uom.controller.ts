import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateUomDto } from './dto/create-uom.dto';
import { UpdateUomDto } from './dto/update-uom.dto';
import { UomService } from './uom.service';

@Controller('uom')
export class UomController {
  constructor(private readonly uomService: UomService) {}

  @Post()
  create(@Body() dto: CreateUomDto) {
    const result = this.uomService.create(dto);
    return { message: 'UoM created', result };
  }

  @Get()
  findAll() {
    const result = this.uomService.findAll();
    return { message: 'UoMs retrieved', result };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const result = this.uomService.findOne(id);
    return { message: 'UoM retrieved', result };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUomDto) {
    const result = this.uomService.update(id, dto);
    return { message: 'UoM updated', result };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.uomService.remove(id);
    return { message: 'UoM deleted', result: { id } };
  }
}
