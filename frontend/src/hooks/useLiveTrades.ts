import { useCallback, useEffect, useState } from "react";
import type { FeedTrade } from "@/lib/api";
import { useWebSocket } from "./useWebSocket";

const MAX_TRADES = 200;

export function useLiveTrades(channels: string[] = ["trades:mentions"]) {
  const [trades, setTrades] = useState<FeedTrade[]>([]);
  const { connected, subscribe } = useWebSocket(channels);

  const handleMessage = useCallback((msg: unknown) => {
    const m = msg as { type?: string; data?: FeedTrade };
    if (m.type === "trade" && m.data) {
      setTrades((prev) => [m.data!, ...prev].slice(0, MAX_TRADES));
    }
  }, []);

  useEffect(() => {
    return subscribe(handleMessage);
  }, [subscribe, handleMessage]);

  return { trades, connected };
}
