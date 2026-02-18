import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ClobClient } from "@polymarket/clob-client";
import { Side } from "@polymarket/clob-client";

export interface CreateOrderParams {
  clobClient: ClobClient;
  tokenId: string;
  side: "BUY" | "SELL";
  size: number;
  price?: number;
  isMarketOrder: boolean;
  negRisk: boolean;
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clobClient,
      tokenId,
      side,
      size,
      price,
      isMarketOrder,
      negRisk,
    }: CreateOrderParams) => {
      let orderPrice: number;

      if (isMarketOrder) {
        const priceData = await clobClient.getPrice(tokenId, side);
        const rawPrice = parseFloat(priceData);
        // apply 5% buffer for slippage
        const buffered = side === "BUY" ? rawPrice * 1.05 : rawPrice * 0.95;
        orderPrice = Math.min(0.99, Math.max(0.01, buffered));
      } else {
        if (price == null) throw new Error("price required for limit orders");
        orderPrice = price;
      }

      const orderSide = side === "BUY" ? Side.BUY : Side.SELL;

      const orderParams = {
        tokenID: tokenId,
        price: orderPrice,
        size,
        side: orderSide,
        feeRateBps: 0,
        nonce: 0,
        taker: "0x0000000000000000000000000000000000000000",
      };

      const signedOrder = await clobClient.createOrder(orderParams, {
        tickSize: "0.01",
        negRisk,
      });
      return clobClient.postOrder(signedOrder);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["openOrders"] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
    },
  });
}
