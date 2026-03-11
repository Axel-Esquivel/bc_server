export enum PosSessionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export interface PosSessionRecord {
  id: string;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  warehouseId: string;
  cashierUserId: string;
  status: PosSessionStatus;
  openingAmount: number;
  closingAmount?: number;
  openedAt: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
