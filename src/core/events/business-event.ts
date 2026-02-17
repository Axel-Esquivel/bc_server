import { v4 as uuid } from 'uuid';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray | undefined;
export interface JsonObject {
  [key: string]: JsonValue;
}
export interface JsonArray extends Array<JsonValue> {}

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

export interface BusinessEvent<TPayload extends JsonObject> {
  id: string;
  type: string;
  occurredAt: Date;
  organizationId: string;
  context: BusinessEventContext;
  ref: BusinessEventRef;
  payload: TPayload;
}

export interface BusinessEventInput<TPayload extends JsonObject> {
  type: string;
  organizationId: string;
  context: BusinessEventContext;
  ref: BusinessEventRef;
  payload: TPayload;
  id?: string;
  occurredAt?: Date;
}

export function createBusinessEvent<TPayload extends JsonObject>(
  input: BusinessEventInput<TPayload>,
): BusinessEvent<TPayload> {
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
