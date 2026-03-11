import { SaleLineRecord } from './sale-line.entity';
import { PaymentRecord } from './payment.entity';

export enum SaleStatus {
  DRAFT = 'DRAFT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface SaleRecord {
  id: string;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  warehouseId: string;
  sessionId: string;
  cashierUserId: string;
  customerId?: string;
  currency: string;
  status: SaleStatus;
  subtotal: number;
  discountTotal: number;
  total: number;
  lines: SaleLineRecord[];
  payments: PaymentRecord[];
  createdAt: Date;
  updatedAt: Date;
}
