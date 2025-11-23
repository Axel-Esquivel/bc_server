import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ConfigureCreditDto } from './dto/configure-credit.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@Body() dto: CreateCustomerDto) {
    const result = this.customersService.create(dto);
    return { message: 'Customer created', result };
  }

  @Get()
  findAll() {
    const result = this.customersService.findAll();
    return { message: 'Customers retrieved', result };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const result = this.customersService.findOne(id);
    return { message: 'Customer retrieved', result };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    const result = this.customersService.update(id, dto);
    return { message: 'Customer updated', result };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.customersService.remove(id);
    return { message: 'Customer removed', result: { id } };
  }

  @Post(':id/credit')
  configureCredit(@Param('id') customerId: string, @Body() dto: ConfigureCreditDto) {
    const result = this.customersService.configureCredit(customerId, dto);
    return { message: 'Customer credit configured', result };
  }

  @Post(':id/transactions')
  recordTransaction(@Param('id') customerId: string, @Body() dto: CreateTransactionDto) {
    const result = this.customersService.recordTransaction(customerId, dto);
    return { message: 'Transaction recorded', result };
  }

  @Get(':id/statement')
  statement(@Param('id') customerId: string) {
    const result = this.customersService.getStatement(customerId);
    return { message: 'Statement generated', result };
  }
}
