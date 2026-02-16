import { v4 as uuid } from 'uuid';

export interface BusinessEventContext {
  countryId?: string;
  companyId?: string;
  enterpriseId: string;
  currencyId?: string;
  year?: number;
  month?: number;
}

export interface BusinessEventRef {
  entity: string;
  id: string;
}

export interface BusinessEvent<TPayload> {
  id: string;
  type: string;
  occurredAt: Date;
  organizationId: string;
  context: BusinessEventContext;
  ref: BusinessEventRef;
  payload: TPayload;
}

export interface BusinessEventInput<TPayload> {
  type: string;
  organizationId: string;
  context: BusinessEventContext;
  ref: BusinessEventRef;
  payload: TPayload;
  id?: string;
  occurredAt?: Date;
}

export function createBusinessEvent<TPayload>(input: BusinessEventInput<TPayload>): BusinessEvent<TPayload> {
  assertEnterpriseContext(input.context);
  return {
    id: input.id ?? uuid(),
    type: input.type,
    occurredAt: input.occurredAt ?? new Date(),
    organizationId: input.organizationId,
    context: input.context,
    ref: input.ref,
    payload: input.payload,
  };
}

export function assertEnterpriseContext(context: BusinessEventContext | undefined | null): void {
  if (!context?.enterpriseId) {
    throw new Error('BusinessEvent context.enterpriseId is required');
  }
}
