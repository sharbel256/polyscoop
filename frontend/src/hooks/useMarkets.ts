import { useQuery } from "@tanstack/react-query";
import {
  fetchMarkets,
  fetchMarket,
  fetchOrderbook,
  type FetchMarketsParams,
} from "@/lib/api";

export function useMarkets(params: FetchMarketsParams = {}) {
  return useQuery({
    queryKey: ["markets", params],
    queryFn: () => fetchMarkets(params),
    staleTime: 30_000,
  });
}

export function useMarket(conditionId: string | undefined) {
  return useQuery({
    queryKey: ["market", conditionId],
    queryFn: () => fetchMarket(conditionId!),
    enabled: !!conditionId,
    staleTime: 30_000,
  });
}

export function useOrderbook(tokenId: string | undefined) {
  return useQuery({
    queryKey: ["orderbook", tokenId],
    queryFn: () => fetchOrderbook(tokenId!),
    enabled: !!tokenId,
    refetchInterval: 10_000, // refresh orderbook every 10s
  });
}
