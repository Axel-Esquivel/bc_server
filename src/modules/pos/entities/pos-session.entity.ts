import type { PosSessionDenominationRecord } from './pos-session-denomination.entity';

export enum PosSessionStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  CLOSING_PENDING = 'CLOSING_PENDING',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export interface PosSessionRecord {
  id: string;
  posConfigId: string;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  warehouseId: string;
  cashierUserId: string;
  openedByUserId: string;
  closedByUserId?: string;
  status: PosSessionStatus;
  openingAmount: number;
  expectedClosingAmount?: number;
  countedClosingAmount?: number;
  differenceAmount?: number;
  openingDenominations?: PosSessionDenominationRecord[];
  closingDenominations?: PosSessionDenominationRecord[];
  openedAt: Date;
  closedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
