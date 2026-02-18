import { useQuery } from "@tanstack/react-query";
import type { ClobClient } from "@polymarket/clob-client";

export function useOpenOrders(
  clobClient: ClobClient | null,
  safeAddress: string | undefined,
) {
  return useQuery({
    queryKey: ["openOrders", safeAddress],
    queryFn: async () => {
      const orders = await clobClient!.getOpenOrders();
      return orders.filter(
        (o: { maker_address?: string; status?: string }) =>
          o.maker_address?.toLowerCase() === safeAddress?.toLowerCase() &&
          o.status === "LIVE",
      );
    },
    enabled: !!clobClient && !!safeAddress,
    refetchInterval: 3_000,
  });
}
