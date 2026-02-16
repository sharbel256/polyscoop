/** localStorage-based trading session persistence, keyed by EOA address. */

export interface TradingSession {
  eoaAddress: string;
  safeAddress: string;
  isSafeDeployed: boolean;
  hasApiCredentials: boolean;
  hasApprovals: boolean;
  apiCredentials?: {
    key: string;
    secret: string;
    passphrase: string;
  };
  lastChecked: number;
}

export type SessionStep =
  | "idle"
  | "checking"
  | "deploying"
  | "credentials"
  | "approvals"
  | "complete";

const STORAGE_PREFIX = "polymarket_trading_session_";

export const loadSession = (address: string): TradingSession | null => {
  const stored = localStorage.getItem(
    `${STORAGE_PREFIX}${address.toLowerCase()}`
  );
  if (!stored) return null;

  try {
    const session = JSON.parse(stored) as TradingSession;
    if (session.eoaAddress.toLowerCase() !== address.toLowerCase()) {
      console.warn("Session address mismatch, clearing invalid session");
      clearSession(address);
      return null;
    }
    return session;
  } catch (e) {
    console.error("Failed to parse session:", e);
    return null;
  }
};

export const saveSession = (
  address: string,
  session: TradingSession
): void => {
  localStorage.setItem(
    `${STORAGE_PREFIX}${address.toLowerCase()}`,
    JSON.stringify(session)
  );
};

export const clearSession = (address: string): void => {
  localStorage.removeItem(`${STORAGE_PREFIX}${address.toLowerCase()}`);
};
