import { useQuery } from "@tanstack/react-query";
import { fetchBuilderTrades } from "@/lib/api";

export function useBuilderTrades() {
  return useQuery({
    queryKey: ["builder-trades"],
    queryFn: () => fetchBuilderTrades(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
