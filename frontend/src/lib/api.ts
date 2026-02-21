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

// ── Market Types (used by trading components) ────────────

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
  neg_risk: boolean;
  tokens: MarketToken[];
  best_bid: number | null;
  best_ask: number | null;
}

// ── Orderbook / Price History ─────────────────────────────

export interface OrderbookLevel {
  price: string;
  size: string;
}

export interface OrderbookWall {
  price: string;
  size: string;
}

export interface OrderbookAnalysis {
  token_id: string;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  spread: number | null;
  mid_price: number | null;
  bid_depth: number;
  ask_depth: number;
  imbalance_ratio: number | null;
  bid_walls: OrderbookWall[];
  ask_walls: OrderbookWall[];
}

export interface PricePoint {
  t: number;
  p: number;
}

export interface PriceHistoryResponse {
  history: PricePoint[];
}

export function fetchMarket(conditionId: string): Promise<MarketSummary> {
  return request<MarketSummary>(`/markets/${encodeURIComponent(conditionId)}`);
}

export function fetchOrderbook(tokenId: string): Promise<OrderbookAnalysis> {
  return request<OrderbookAnalysis>(
    `/markets/${encodeURIComponent(tokenId)}/orderbook`,
  );
}

export function fetchPriceHistory(
  tokenId: string,
  interval = "1h",
  fidelity = 100,
): Promise<PriceHistoryResponse> {
  const qs = new URLSearchParams({
    market: tokenId,
    interval,
    fidelity: String(fidelity),
  });
  return request<PriceHistoryResponse>(`/prices/history?${qs}`);
}

// ── Positions ─────────────────────────────────────────────

export interface Position {
  asset: string;
  conditionId: string;
  size: number;
  avgPrice: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  curPrice: number;
  title: string;
  outcome: string;
  icon: string;
  slug: string;
}

export function fetchPositions(user: string): Promise<Position[]> {
  return request<Position[]>(`/positions?user=${encodeURIComponent(user)}`);
}

// ── Leaderboard ──────────────────────────────────────────

export interface LeaderboardEntry {
  address: string;
  volume: number;
  pnl: number;
  win_rate: number;
  trade_count: number;
  rank_volume: number;
  rank_pnl: number;
}

export interface LeaderboardResponse {
  wallets: LeaderboardEntry[];
  total: number;
  timeframe: string;
}

export interface LeaderboardFilters {
  min_trades?: number;
  min_volume?: number;
  min_win_rate?: number;
  pnl_positive?: boolean;
  label?: string;
  market?: string;
  event_id?: string;
  from_ts?: number;
  to_ts?: number;
}

export function fetchLeaderboard(
  timeframe = "7d",
  sortBy = "volume",
  sortDir = "desc",
  limit = 50,
  offset = 0,
  category = "mentions",
  filters?: LeaderboardFilters,
): Promise<LeaderboardResponse> {
  const qs = new URLSearchParams({
    timeframe,
    sort_by: sortBy,
    sort_dir: sortDir,
    limit: String(limit),
    offset: String(offset),
    category,
  });

  if (filters) {
    if (filters.min_trades != null)
      qs.set("min_trades", String(filters.min_trades));
    if (filters.min_volume != null)
      qs.set("min_volume", String(filters.min_volume));
    if (filters.min_win_rate != null)
      qs.set("min_win_rate", String(filters.min_win_rate));
    if (filters.pnl_positive) qs.set("pnl_positive", "true");
    if (filters.label) qs.set("label", filters.label);
    if (filters.market) qs.set("market", filters.market);
    if (filters.event_id) qs.set("event_id", filters.event_id);
    if (filters.from_ts != null) qs.set("from_ts", String(filters.from_ts));
    if (filters.to_ts != null) qs.set("to_ts", String(filters.to_ts));
  }

  return request<LeaderboardResponse>(`/wallets/leaderboard?${qs}`);
}

// ── Wallet Profile ───────────────────────────────────────

export interface WalletProfile {
  address: string;
  first_seen: string | null;
  last_seen: string | null;
  total_trades: number;
  total_volume: number;
  labels: string[];
  scores: Record<
    string,
    {
      volume: number;
      pnl: number;
      win_rate: number;
      trade_count: number;
      rank_volume: number;
    }
  >;
  recent_trades: WalletTrade[];
}

export interface WalletTrade {
  transaction_hash: string;
  asset_id?: string;
  condition_id: string;
  side: string;
  size: number;
  price: number;
  outcome: string;
  title: string;
  timestamp: number;
}

export function fetchWalletProfile(address: string): Promise<WalletProfile> {
  return request<WalletProfile>(`/wallets/${address}`);
}

export interface WalletTradesResponse {
  trades: WalletTrade[];
  total: number;
}

export function fetchWalletTrades(
  address: string,
  limit = 50,
  offset = 0,
): Promise<WalletTradesResponse> {
  const qs = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return request<WalletTradesResponse>(`/wallets/${address}/trades?${qs}`);
}

// ── Feed ─────────────────────────────────────────────────

export interface FeedTrade {
  transaction_hash: string;
  asset_id: string;
  condition_id: string;
  wallet: string;
  side: string;
  size: number;
  price: number;
  outcome: string;
  title: string;
  timestamp: number;
}

export interface FeedTradesResponse {
  trades: FeedTrade[];
}

export function fetchFeedTrades(
  limit = 50,
  category = "mentions",
): Promise<FeedTradesResponse> {
  const qs = new URLSearchParams({
    limit: String(limit),
    category,
  });
  return request<FeedTradesResponse>(`/wallets/feed/trades?${qs}`);
}

// ── Signup ───────────────────────────────────────────

export interface SignupResponse {
  ok: boolean;
  message: string;
}

export function signupForUpdates(email: string): Promise<SignupResponse> {
  return request<SignupResponse>("/signup", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

// ── Builder Attribution ──────────────────────────────

export interface BuilderTrade {
  id: string;
  market: string;
  asset_id: string;
  side: string;
  size: string;
  price: string;
  status: string;
  outcome: string;
  owner: string;
  transaction_hash: string;
  match_time: string;
  fee_rate_bps: string;
}

export interface BuilderTradesResponse {
  trades: BuilderTrade[];
  count: number;
  next_cursor: string | null;
}

export function fetchBuilderTrades(
  before?: string,
  after?: string,
): Promise<BuilderTradesResponse> {
  const qs = new URLSearchParams();
  if (before) qs.set("before", before);
  if (after) qs.set("after", after);
  const query = qs.toString();
  return request<BuilderTradesResponse>(
    `/builder/trades${query ? `?${query}` : ""}`,
  );
}

// ── Copy Trade ───────────────────────────────────────────

export interface CopytradeConfig {
  id: number;
  user_address: string;
  target_wallet: string;
  fraction: number;
  max_position_usd: number;
  daily_limit_usd: number;
  delay_seconds: number;
  slippage_tolerance: number;
  cooldown_seconds: number;
  enabled: boolean;
  filters: Record<string, unknown>;
  created_at: string;
}

export interface CopytradeExecution {
  id: number;
  config_id: number;
  target_wallet: string;
  source_trade_hash: string;
  condition_id: string;
  side: string;
  target_size: number;
  copy_size: number;
  target_price: number;
  executed_price: number | null;
  slippage: number | null;
  status: string;
  reason: string;
  pnl: number | null;
  created_at: string;
}

export function fetchCopytradeConfigs(
  userAddress: string,
): Promise<{ configs: CopytradeConfig[] }> {
  return request<{ configs: CopytradeConfig[] }>(
    `/copytrade/configs?user_address=${encodeURIComponent(userAddress)}`,
  );
}

export function createCopytradeConfig(
  data: Omit<CopytradeConfig, "id" | "created_at" | "enabled">,
): Promise<CopytradeConfig> {
  return request<CopytradeConfig>("/copytrade/configs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateCopytradeConfig(
  configId: number,
  userAddress: string,
  data: Partial<CopytradeConfig>,
): Promise<CopytradeConfig> {
  return request<CopytradeConfig>(
    `/copytrade/configs/${configId}?user_address=${encodeURIComponent(userAddress)}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export function deleteCopytradeConfig(
  configId: number,
  userAddress: string,
): Promise<void> {
  return request<void>(
    `/copytrade/configs/${configId}?user_address=${encodeURIComponent(userAddress)}`,
    { method: "DELETE" },
  );
}

export function fetchCopytradeHistory(
  userAddress: string,
  limit = 50,
  offset = 0,
): Promise<{ executions: CopytradeExecution[]; total: number }> {
  const qs = new URLSearchParams({
    user_address: userAddress,
    limit: String(limit),
    offset: String(offset),
  });
  return request<{ executions: CopytradeExecution[]; total: number }>(
    `/copytrade/history?${qs}`,
  );
}
