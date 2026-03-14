/**
 * API client – thin wrapper around fetch that talks to the FastAPI backend.
 * In dev, Vite proxies /api → http://localhost:8000.
 */

const BASE = "/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { headers: initHeaders, ...rest } = init ?? {};
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: { "Content-Type": "application/json", ...initHeaders },
  });

  if (!res.ok) {
    let message = `request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.detail) message = body.detail;
    } catch {
      // non-JSON response, keep generic message
    }
    throw new Error(message);
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
  roi: number;
  consistency: number;
  profile_image_url: string | null;
  display_name: string | null;
  last_trade_at: number | null;
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
  max_bot_score?: number;
  min_roi?: number;
  min_consistency?: number;
  primary_category?: string;
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
    if (filters.max_bot_score != null)
      qs.set("max_bot_score", String(filters.max_bot_score));
    if (filters.min_roi != null) qs.set("min_roi", String(filters.min_roi));
    if (filters.min_consistency != null)
      qs.set("min_consistency", String(filters.min_consistency));
    if (filters.primary_category)
      qs.set("primary_category", filters.primary_category);
  }

  return request<LeaderboardResponse>(`/wallets/leaderboard?${qs}`);
}

// ── Wallet Profile ───────────────────────────────────────

export interface TraderProfileData {
  median_trade_interval_s: number;
  trade_interval_cv: number;
  size_cv: number;
  active_hours: number;
  bot_score: number;
  primary_category: string;
  category_concentration: number;
  market_count: number;
  avg_entry_timing: number;
  avg_hold_duration_h: number;
  avg_position_size_usd: number;
}

export interface LiveStats {
  current_value: number;
  unrealized_pnl: number;
  open_positions: number;
}

export interface WalletProfile {
  address: string;
  first_seen: string | null;
  last_seen: string | null;
  total_trades: number;
  total_volume: number;
  labels: string[];
  profile_image_url: string | null;
  display_name: string | null;
  trader_profile: TraderProfileData | null;
  live_stats: LiveStats;
  scores: Record<
    string,
    {
      volume: number;
      pnl: number;
      win_rate: number;
      trade_count: number;
      rank_volume: number;
      roi: number;
      consistency: number;
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

// ── Closed Positions ─────────────────────────────────────

export interface ClosedPosition {
  asset: string;
  conditionId: string;
  avgPrice: number;
  totalBought: number;
  realizedPnl: number;
  curPrice: number;
  timestamp: number;
  title: string;
  slug: string;
  icon: string;
  outcome: string;
  endDate: string;
}

export interface ClosedPositionsResponse {
  positions: ClosedPosition[];
  has_more: boolean;
}

export function fetchClosedPositions(
  address: string,
  limit = 50,
  offset = 0,
  sortBy = "TIMESTAMP",
  sortDir = "DESC",
): Promise<ClosedPositionsResponse> {
  const qs = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    sort_by: sortBy,
    sort_dir: sortDir,
  });
  return request<ClosedPositionsResponse>(
    `/wallets/${address}/closed-positions?${qs}`,
  );
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
  profile_image_url: string | null;
  display_name: string | null;
  market_image: string | null;
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

// ── Getit (Resy) ─────────────────────────────────────────

function authRequest<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  return request<T>(path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init?.headers },
  });
}

export interface GetitUser {
  id: string;
  email: string;
  resy_connected: boolean;
  resy_token_updated_at: string | null;
}

export interface GetitLoginResponse {
  token: string;
  user: GetitUser;
}

export function getitLogin(
  email: string,
  password: string,
): Promise<GetitLoginResponse> {
  return request<GetitLoginResponse>("/getit/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function getitMe(token: string): Promise<GetitUser> {
  return authRequest<GetitUser>("/getit/me", token);
}

export function getitLogout(token: string): Promise<void> {
  return authRequest<void>("/getit/logout", token, { method: "POST" });
}

export interface GetitVenue {
  venue_id: number;
  name: string;
  region: string;
  cuisine: string[];
  price_range: number;
  rating: number;
  url_slug: string;
  images: string[];
}

export function getitSearchVenues(
  token: string,
  query: string,
  date: string,
  partySize: number,
): Promise<GetitVenue[]> {
  const qs = new URLSearchParams({
    query,
    date,
    party_size: String(partySize),
  });
  return authRequest<GetitVenue[]>(`/getit/search?${qs}`, token);
}

export interface GetitSlot {
  time: string;
  config_token: string;
  type: string;
  availability_id: number;
}

export function getitFetchSlots(
  token: string,
  venueId: number,
  date: string,
  partySize: number,
): Promise<GetitSlot[]> {
  const qs = new URLSearchParams({
    date,
    party_size: String(partySize),
  });
  return authRequest<GetitSlot[]>(
    `/getit/venues/${venueId}/slots?${qs}`,
    token,
  );
}

export interface GetitBookResponse {
  reservation_id: number;
  details: Record<string, unknown>;
}

export function getitBook(
  token: string,
  data: {
    venue_id: number;
    config_token: string;
    date: string;
    party_size: number;
  },
): Promise<GetitBookResponse> {
  return authRequest<GetitBookResponse>("/getit/book", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface GetitJobRun {
  attempt: number;
  action: string;
  timestamp: string;
  details: Record<string, unknown> | null;
}

export interface GetitJob {
  id: string;
  venue_name: string;
  venue_id: number;
  date: string;
  desired_time: string;
  party_size: number;
  mode: string;
  snipe_at: string | null;
  poll_interval_seconds: number | null;
  time_flex_minutes: number;
  status: string;
  attempts: number;
  max_attempts: number;
  last_attempt_at: string | null;
  result: Record<string, unknown> | null;
  runs: GetitJobRun[];
  created_at: string;
  updated_at: string;
}

export function getitCreateJob(
  token: string,
  data: {
    venue_name: string;
    venue_id: number;
    date: string;
    desired_time: string;
    party_size: number;
    mode: string;
    snipe_at?: string;
    poll_interval_seconds?: number;
    time_flex_minutes?: number;
    max_attempts?: number;
  },
): Promise<GetitJob> {
  return authRequest<GetitJob>("/getit/jobs", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getitStats(token: string): Promise<{
  pending: number;
  active: number;
  scheduler_active: boolean;
  last_resy_check: {
    status_code: number | null;
    at: string | null;
    ok: boolean;
  } | null;
}> {
  return authRequest("/getit/stats", token);
}

export function getitListJobs(token: string): Promise<GetitJob[]> {
  return authRequest<GetitJob[]>("/getit/jobs", token);
}

export function getitAdminListJobs(token: string): Promise<GetitJob[]> {
  return authRequest<GetitJob[]>("/getit/admin/jobs", token);
}

export function getitAdminDebugFind(
  token: string,
  jobId: string,
): Promise<{ status_code: number; body: string }> {
  return authRequest<{ status_code: number; body: string }>(
    `/getit/admin/jobs/${jobId}/find`,
    token,
  );
}

export function getitGetJob(token: string, jobId: string): Promise<GetitJob> {
  return authRequest<GetitJob>(`/getit/jobs/${jobId}`, token);
}

export function getitCancelJob(
  token: string,
  jobId: string,
): Promise<GetitJob> {
  return authRequest<GetitJob>(`/getit/jobs/${jobId}`, token, {
    method: "PATCH",
    body: JSON.stringify({ status: "cancelled" }),
  });
}

export interface GetitActivity {
  id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export function getitFetchActivity(
  token: string,
  limit = 50,
): Promise<GetitActivity[]> {
  return authRequest<GetitActivity[]>(`/getit/activity?limit=${limit}`, token);
}

export interface GetitAdminUser {
  id: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

export function getitAdminListUsers(token: string): Promise<GetitAdminUser[]> {
  return authRequest<GetitAdminUser[]>("/getit/admin/users", token);
}

export interface GetitWorkerStatus {
  resy_scheduler: boolean;
}

export function getitAdminWorkerStatus(
  token: string,
): Promise<GetitWorkerStatus> {
  return authRequest<GetitWorkerStatus>("/getit/admin/workers", token);
}

export function getitAdminToggleWorker(
  token: string,
  data: { resy_scheduler: boolean },
): Promise<GetitWorkerStatus> {
  return authRequest<GetitWorkerStatus>("/getit/admin/workers", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getitAdminUpdateUser(
  token: string,
  userId: string,
  data: { is_admin?: boolean; is_active?: boolean },
): Promise<GetitAdminUser> {
  return authRequest<GetitAdminUser>(`/getit/admin/users/${userId}`, token, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
