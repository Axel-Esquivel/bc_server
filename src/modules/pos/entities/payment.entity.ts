export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  VOUCHER = 'VOUCHER',
}

export interface PaymentRecord {
  id: string;
  method: PaymentMethod;
  amount: number;
  currency: string;
  OrganizationId: string;
  companyId: string;
  reference?: string;
}
