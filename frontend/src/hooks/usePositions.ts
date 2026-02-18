import { useQuery } from "@tanstack/react-query";
import { fetchPositions } from "@/lib/api";

export function usePositions(safeAddress: string | undefined) {
  const query = useQuery({
    queryKey: ["positions", safeAddress],
    queryFn: () => fetchPositions(safeAddress!),
    enabled: !!safeAddress,
    refetchInterval: 5_000,
  });

  const totalPositionsValue =
    query.data?.reduce((sum, p) => sum + p.currentValue, 0) ?? 0;

  return {
    positions: query.data ?? [],
    totalPositionsValue,
    isLoading: query.isLoading,
    error: query.error,
  };
}
