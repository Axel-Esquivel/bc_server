import { PaymentMethod } from './payment.entity';

export interface PosConfigRecord {
  id: string;
  name: string;
  code: string;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  warehouseId: string;
  currencyId: string;
  active: boolean;
  allowedPaymentMethods: PaymentMethod[];
  allowedUserIds: string[];
  requiresOpening: boolean;
  allowOtherUsersClose: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
