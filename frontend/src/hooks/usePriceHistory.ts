import { useQuery } from "@tanstack/react-query";
import { fetchPriceHistory } from "@/lib/api";

export function usePriceHistory(
  market: string | undefined,
  interval = "1h",
  fidelity = 100,
) {
  return useQuery({
    queryKey: ["priceHistory", market, interval, fidelity],
    queryFn: () => fetchPriceHistory(market!, interval, fidelity),
    enabled: !!market,
    staleTime: 60_000,
  });
}
