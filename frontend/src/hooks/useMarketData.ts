import { useQuery } from "@tanstack/react-query";
import { fetchMarket, fetchOrderbook, fetchPriceHistory } from "@/lib/api";

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
    refetchInterval: 5_000,
  });
}

export function usePriceHistory(
  tokenId: string | undefined,
  interval = "1h",
  fidelity = 100,
) {
  return useQuery({
    queryKey: ["priceHistory", tokenId, interval, fidelity],
    queryFn: () => fetchPriceHistory(tokenId!, interval, fidelity),
    enabled: !!tokenId,
    staleTime: 60_000,
  });
}
