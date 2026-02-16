/**
 * API client – thin wrapper around fetch that talks to the FastAPI backend.
 * In dev, Vite proxies /api → http://localhost:8000.
 */

const BASE = "/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  return res.json();
}

// ── Signing ───────────────────────────────────────────────

export interface SignPayload {
  method: string;
  path: string;
  body?: string;
}

export interface SignResult {
  POLY_BUILDER_SIGNATURE: string;
  POLY_BUILDER_TIMESTAMP: string;
  POLY_BUILDER_API_KEY: string;
  POLY_BUILDER_PASSPHRASE: string;
}

export function signBuilderRequest(payload: SignPayload): Promise<SignResult> {
  return request<SignResult>("/signing/sign", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ── Markets ───────────────────────────────────────────────

export interface MarketToken {
  token_id: string;
  outcome: string;
  price: number | null;
  winner: boolean | null;
}

export interface MarketSummary {
  condition_id: string;
  question: string;
  slug: string;
  description: string;
  category: string;
  image: string;
  end_date: string;
  active: boolean;
  closed: boolean;
  volume: number;
  liquidity: number;
  tokens: MarketToken[];
  best_bid: number | null;
  best_ask: number | null;
}

export interface MarketsResponse {
  markets: MarketSummary[];
  count: number;
  next_cursor: string | null;
}

export interface FetchMarketsParams {
  limit?: number;
  offset?: number;
  active?: boolean;
  closed?: boolean;
  order?: string;
  ascending?: boolean;
}

export function fetchMarkets(
  params: FetchMarketsParams = {},
): Promise<MarketsResponse> {
  const qs = new URLSearchParams();
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  if (params.active !== undefined) qs.set("active", String(params.active));
  if (params.closed !== undefined) qs.set("closed", String(params.closed));
  if (params.order) qs.set("order", params.order);
  if (params.ascending !== undefined)
    qs.set("ascending", String(params.ascending));

  const query = qs.toString();
  return request<MarketsResponse>(`/markets${query ? `?${query}` : ""}`);
}

export function fetchMarket(conditionId: string): Promise<MarketSummary> {
  return request<MarketSummary>(`/markets/${conditionId}`);
}

// ── Orderbook ─────────────────────────────────────────────

export interface OrderbookSummary {
  token_id: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
  spread: number | null;
  mid_price: number | null;
}

export function fetchOrderbook(tokenId: string): Promise<OrderbookSummary> {
  return request<OrderbookSummary>(`/markets/${tokenId}/orderbook`);
}
