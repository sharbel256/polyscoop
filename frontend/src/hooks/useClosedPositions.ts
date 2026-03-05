import { useQuery } from "@tanstack/react-query";
import { fetchClosedPositions } from "@/lib/api";

export function useClosedPositions(
  address: string | undefined,
  limit = 50,
  offset = 0,
  sortBy = "TIMESTAMP",
  sortDir = "DESC",
) {
  return useQuery({
    queryKey: ["closedPositions", address, limit, offset, sortBy, sortDir],
    queryFn: () =>
      fetchClosedPositions(address!, limit, offset, sortBy, sortDir),
    enabled: !!address,
  });
}
