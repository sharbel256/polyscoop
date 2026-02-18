import { useQuery } from "@tanstack/react-query";
import { fetchTrades } from "@/lib/api";

export function useTrades(market: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ["trades", market, limit],
    queryFn: () => fetchTrades(market!, limit),
    enabled: !!market,
    refetchInterval: 5_000,
  });
}
