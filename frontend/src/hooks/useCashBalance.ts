import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import { USDC_E_CONTRACT_ADDRESS, USDC_E_DECIMALS } from "@/constants/tokens";
import { erc20Abi, formatUnits } from "viem";

export function useCashBalance(safeAddress: string | undefined) {
  const { publicClient } = useWallet();

  const query = useQuery({
    queryKey: ["cashBalance", safeAddress],
    queryFn: async () => {
      const balance = await publicClient!.readContract({
        address: USDC_E_CONTRACT_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [safeAddress as `0x${string}`],
      });
      return balance as bigint;
    },
    enabled: !!safeAddress && !!publicClient,
    refetchInterval: 3_000,
  });

  const rawBalance = query.data ?? 0n;
  const formatted = formatUnits(rawBalance, USDC_E_DECIMALS);

  return {
    cashBalance: rawBalance,
    formattedCashBalance: parseFloat(formatted).toFixed(2),
    isLoading: query.isLoading,
  };
}
