import { useQuery } from "@tanstack/react-query";
import { fetchPositions } from "@/lib/api";

export function useWalletPositions(address: string | undefined) {
  return useQuery({
    queryKey: ["walletPositions", address],
    queryFn: () => fetchPositions(address!),
    enabled: !!address,
    refetchInterval: 10_000,
  });
}
