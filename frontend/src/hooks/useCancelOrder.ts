import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ClobClient } from "@polymarket/clob-client";

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clobClient,
      orderID,
    }: {
      clobClient: ClobClient;
      orderID: string;
    }) => {
      return clobClient.cancelOrder({ orderID });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["openOrders"] });
    },
  });
}
