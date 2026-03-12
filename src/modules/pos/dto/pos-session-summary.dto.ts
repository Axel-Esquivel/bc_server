import { PaymentMethod } from '../entities/payment.entity';
import { PosSessionDenominationRecord } from '../entities/pos-session-denomination.entity';

export interface PosSessionSummaryDto {
  sessionId: string;
  currency: string;
  openingAmount: number;
  expectedClosingAmount: number;
  totalSales: number;
  cashPayments: number;
  paymentsByMethod: Record<PaymentMethod, number>;
  cashMovements: number;
  openingDenominations?: PosSessionDenominationRecord[];
}
