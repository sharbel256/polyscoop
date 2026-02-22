import { useQuery } from "@tanstack/react-query";
import { fetchWalletProfile } from "@/lib/api";

export function useWalletProfile(address: string | undefined) {
  return useQuery({
    queryKey: ["walletProfile", address],
    queryFn: () => fetchWalletProfile(address!),
    enabled: !!address,
    refetchInterval: 30_000,
  });
}
