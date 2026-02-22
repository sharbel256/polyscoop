import { useQuery } from "@tanstack/react-query";
import { fetchWalletTrades } from "@/lib/api";

export function useWalletTrades(
  address: string | undefined,
  limit = 50,
  offset = 0,
) {
  return useQuery({
    queryKey: ["walletTrades", address, limit, offset],
    queryFn: () => fetchWalletTrades(address!, limit, offset),
    enabled: !!address,
  });
}
