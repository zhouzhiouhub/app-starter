export type ApiScope =
  | "page:read"
  | "page:write"
  | "page:publish"
  | "theme:read"
  | "theme:write"
  | "theme:publish"
  | "market:read"
  | "market:write"
  | "translation:read"
  | "translation:write"
  | "product:read"
  | "product:write"
  | "order:read"
  | "order:write"
  | "payment:read"
  | "refund:create"
  | "extension:manage"
  | "webhook:manage";

export interface ExtensionManifest {
  name: string;
  version: string;
  owner: string;
  requiredScopes: ApiScope[];
  adminRoutes?: Array<{ path: string; label: string }>;
  storefrontBlocks?: Array<{ slug: string; label: string }>;
  webhookSubscriptions?: Array<{ event: string; targetUrl: string }>;
}

export interface DomainEvent<TPayload = unknown> {
  id: string;
  type: string;
  version: number;
  tenantId: string;
  siteId?: string;
  actorId?: string;
  correlationId: string;
  occurredAt: string;
  payload: TPayload;
}
