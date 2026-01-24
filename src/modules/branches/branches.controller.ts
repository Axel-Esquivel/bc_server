import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyPermission } from '../companies/decorators/company-permission.decorator';
import { CompanyPermissionGuard } from '../companies/guards/company-permission.guard';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchesService } from './branches.service';

@Controller()
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @UseGuards(JwtAuthGuard, CompanyPermissionGuard)
  @CompanyPermission('company.manage')
  @Post('companies/:companyId/branches')
  create(@Param('companyId') companyId: string, @Body() dto: CreateBranchDto) {
    const result = this.branchesService.create(companyId, dto);
    return { message: 'Branch created', result };
  }

  @UseGuards(JwtAuthGuard, CompanyPermissionGuard)
  @CompanyPermission('company.manage')
  @Get('companies/:companyId/branches')
  list(@Param('companyId') companyId: string) {
    const result = this.branchesService.listByCompany(companyId);
    return { message: 'Branches retrieved', result };
  }

  @UseGuards(JwtAuthGuard, CompanyPermissionGuard)
  @CompanyPermission('company.manage')
  @Patch('branches/:id')
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    const result = this.branchesService.update(id, dto);
    return { message: 'Branch updated', result };
  }
}
