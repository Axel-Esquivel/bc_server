import { Injectable } from '@nestjs/common';

@Injectable()
export class Ean13Service {
  computeCheckDigit(base12: string): string {
    if (!/^\d{12}$/.test(base12)) {
      throw new Error('EAN base must be 12 digits');
    }
    let sum = 0;
    for (let i = 0; i < base12.length; i += 1) {
      const digit = Number(base12[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const mod = sum % 10;
    const check = mod === 0 ? 0 : 10 - mod;
    return String(check);
  }

  buildInternalBarcode(prefix: string, type: '01' | '02', seq: number): string {
    if (!/^\d{3,7}$/.test(prefix)) {
      throw new Error('EAN prefix must be 3 to 7 digits');
    }
    const prefixLen = prefix.length;
    const sequenceLength = 12 - prefixLen - 2;
    if (sequenceLength <= 0) {
      throw new Error('EAN prefix too long');
    }
    const seqStr = String(seq).padStart(sequenceLength, '0');
    if (seqStr.length > sequenceLength) {
      throw new Error('EAN sequence overflow');
    }
    const base12 = `${prefix}${type}${seqStr}`;
    const check = this.computeCheckDigit(base12);
    return `${base12}${check}`;
  }
}
