export enum PosDenominationType {
  BILL = 'bill',
  COIN = 'coin',
}

export interface PosSessionDenominationRecord {
  sessionId: string;
  stage: 'opening' | 'closing';
  currencyId: string;
  denominationValue: number;
  denominationType: PosDenominationType;
  quantity: number;
  subtotal: number;
}
