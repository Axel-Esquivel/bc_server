import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { SalesReportQueryDto } from './dto/sales-report-query.dto';
import { InventoryRotationQueryDto } from './dto/inventory-rotation-query.dto';
import { MarginCategoryQueryDto } from './dto/margin-category-query.dto';
import { ExpiryProjectionQueryDto } from './dto/expiry-projection-query.dto';
import { ExportReportDto } from './dto/export-report.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  salesReport(@Query() query: SalesReportQueryDto) {
    return {
      message: 'Sales report generated',
      result: this.reportsService.getSalesByDayStoreSku(query),
    };
  }

  @Get('inventory-rotation')
  inventoryRotation(@Query() query: InventoryRotationQueryDto) {
    return {
      message: 'Inventory rotation report generated',
      result: this.reportsService.getInventoryRotation(query),
    };
  }

  @Get('margins')
  marginByCategory(@Query() query: MarginCategoryQueryDto) {
    return {
      message: 'Margin by category report generated',
      result: this.reportsService.getMarginByCategory(query),
    };
  }

  @Get('expiry-projection')
  expiryProjection(@Query() query: ExpiryProjectionQueryDto) {
    return {
      message: 'Expiry projection report generated',
      result: this.reportsService.getExpiryProjection(query),
    };
  }

  @Post('export')
  exportReport(@Body() dto: ExportReportDto) {
    return {
      message: 'Report export requested',
      result: this.reportsService.exportToExcel(dto),
    };
  }
}
