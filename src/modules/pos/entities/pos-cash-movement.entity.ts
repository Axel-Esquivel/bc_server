import { PaymentMethod } from './payment.entity';

export enum PosCashMovementType {
  INCOME = 'income',
  EXPENSE = 'expense',
  WITHDRAWAL = 'withdrawal',
  FLOAT = 'float',
  ADJUSTMENT = 'adjustment',
}

export interface PosCashMovementRecord {
  id: string;
  sessionId: string;
  type: PosCashMovementType;
  amount: number;
  currencyId: string;
  paymentMethod: PaymentMethod;
  reason: string;
  notes?: string;
  createdByUserId: string;
  createdAt: Date;
}
