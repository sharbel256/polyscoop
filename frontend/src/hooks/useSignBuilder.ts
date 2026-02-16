import { useCallback } from "react";
import {
  signBuilderRequest,
  type SignPayload,
  type SignResult,
} from "@/lib/api";

/**
 * Hook for signing builder requests through the backend.
 * This keeps builder credentials server-side and secure.
 */
export function useSignBuilder() {
  const sign = useCallback(
    async (payload: SignPayload): Promise<SignResult> => {
      return signBuilderRequest(payload);
    },
    [],
  );

  return { sign };
}
