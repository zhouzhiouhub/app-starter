export interface AdapterContext {
  tenantId: string;
  siteId?: string;
  requestId: string;
  idempotencyKey?: string;
}

export interface PaymentProvider {
  createIntent(input: unknown, context: AdapterContext): Promise<unknown>;
  refund(input: unknown, context: AdapterContext): Promise<unknown>;
  handleWebhook(payload: unknown, signature: string): Promise<unknown>;
  verifySignature(payload: unknown, signature: string): Promise<boolean>;
}

export interface ShippingProvider {
  quoteRates(input: unknown, context: AdapterContext): Promise<unknown>;
  createShipment(input: unknown, context: AdapterContext): Promise<unknown>;
  trackShipment(input: unknown, context: AdapterContext): Promise<unknown>;
}

export interface TaxProvider {
  quoteTax(input: unknown, context: AdapterContext): Promise<unknown>;
  validateAddress(input: unknown, context: AdapterContext): Promise<unknown>;
}

export interface AnalyticsProvider {
  track(input: unknown, context: AdapterContext): Promise<void>;
  identify(input: unknown, context: AdapterContext): Promise<void>;
  flush(context: AdapterContext): Promise<void>;
}
