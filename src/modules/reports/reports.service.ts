import { Injectable } from '@nestjs/common';
import { SalesReportQueryDto } from './dto/sales-report-query.dto';
import { InventoryRotationQueryDto } from './dto/inventory-rotation-query.dto';
import { MarginCategoryQueryDto } from './dto/margin-category-query.dto';
import { ExpiryProjectionQueryDto } from './dto/expiry-projection-query.dto';
import { ExportReportDto } from './dto/export-report.dto';

@Injectable()
export class ReportsService {
  getSalesByDayStoreSku(query: SalesReportQueryDto) {
    return {
      filters: query,
      rows: [],
      summary: { totalSales: 0, totalUnits: 0 },
      notes: 'Stubbed sales report. Replace with aggregation pipeline over sales documents.',
    };
  }

  getInventoryRotation(query: InventoryRotationQueryDto) {
    return {
      filters: query,
      rows: [],
      summary: { turns: 0, averageDaysOnHand: 0 },
      notes: 'Stubbed inventory rotation report. Implement using stock projections and movements.',
    };
  }

  getMarginByCategory(query: MarginCategoryQueryDto) {
    return {
      filters: query,
      rows: [],
      summary: { totalRevenue: 0, totalCost: 0, marginPct: 0 },
      notes: 'Stubbed margin report. Calculate margins per category with pricing and cost data.',
    };
  }

  getExpiryProjection(query: ExpiryProjectionQueryDto) {
    return {
      filters: query,
      rows: [],
      summary: { expiringSoon: 0, expired: 0 },
      notes: 'Stubbed expiry projection. Use batch expiry dates and FEFO rules.',
    };
  }

  exportToExcel(dto: ExportReportDto) {
    // TODO: Integrate with xlsx-ops microservice (HTTP/gRPC) to generate Excel files.
    return {
      reportType: dto.reportType,
      exportUrl: 'https://xlsx-ops.example.com/exports/{id}',
      payload: dto.payload,
      notes: 'Stub export. Replace with real call to xlsx-ops to generate Excel file.',
    };
  }
}
