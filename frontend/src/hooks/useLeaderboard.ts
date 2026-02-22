import { useQuery } from "@tanstack/react-query";
import { fetchLeaderboard, type LeaderboardFilters } from "@/lib/api";

export function useLeaderboard(
  sortBy = "volume",
  sortDir = "desc",
  timeframe = "7d",
  limit = 50,
  offset = 0,
  category = "mentions",
  filters?: LeaderboardFilters,
) {
  return useQuery({
    queryKey: [
      "leaderboard",
      timeframe,
      sortBy,
      sortDir,
      limit,
      offset,
      category,
      filters,
    ],
    queryFn: () =>
      fetchLeaderboard(
        timeframe,
        sortBy,
        sortDir,
        limit,
        offset,
        category,
        filters,
      ),
    refetchInterval: 60_000,
  });
}
