import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCopytradeConfig,
  deleteCopytradeConfig,
  fetchCopytradeConfigs,
  fetchCopytradeHistory,
  updateCopytradeConfig,
} from "@/lib/api";

export function useCopytradeConfigs(userAddress: string | undefined) {
  return useQuery({
    queryKey: ["copytradeConfigs", userAddress],
    queryFn: () => fetchCopytradeConfigs(userAddress!),
    enabled: !!userAddress,
  });
}

export function useCreateCopytradeConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCopytradeConfig,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["copytradeConfigs"] }),
  });
}

export function useUpdateCopytradeConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      configId,
      userAddress,
      data,
    }: {
      configId: number;
      userAddress: string;
      data: Parameters<typeof updateCopytradeConfig>[2];
    }) => updateCopytradeConfig(configId, userAddress, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["copytradeConfigs"] }),
  });
}

export function useDeleteCopytradeConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      configId,
      userAddress,
    }: {
      configId: number;
      userAddress: string;
    }) => deleteCopytradeConfig(configId, userAddress),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["copytradeConfigs"] }),
  });
}

export function useCopytradeHistory(
  userAddress: string | undefined,
  limit = 50,
  offset = 0,
) {
  return useQuery({
    queryKey: ["copytradeHistory", userAddress, limit, offset],
    queryFn: () => fetchCopytradeHistory(userAddress!, limit, offset),
    enabled: !!userAddress,
  });
}
