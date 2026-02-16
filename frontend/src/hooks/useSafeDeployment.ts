/**
 * Handles Safe wallet derivation and deployment.
 * The Safe address is deterministically derived from the user's EOA.
 */

import { useCallback, useMemo } from "react";
import { useWallet } from "@/hooks/useWallet";
import type { RelayClient } from "@polymarket/builder-relayer-client";
import { deriveSafe } from "@polymarket/builder-relayer-client/dist/builder/derive";
import { getContractConfig } from "@polymarket/builder-relayer-client/dist/config";
import { POLYGON_CHAIN_ID } from "@/constants/polymarket";

export default function useSafeDeployment() {
  const { eoaAddress, isConnected, publicClient } = useWallet();

  /** Deterministically derived Safe address from the user's EOA. */
  const derivedSafeAddressFromEoa = useMemo(() => {
    if (!eoaAddress || !isConnected) return null;

    try {
      const config = getContractConfig(POLYGON_CHAIN_ID);
      return deriveSafe(eoaAddress, config.SafeContracts.SafeFactory);
    } catch (error) {
      console.error("Error deriving Safe address:", error);
      return null;
    }
  }, [eoaAddress, isConnected]);

  /** Check if the Safe is deployed by querying the relay client or RPC. */
  const isSafeDeployed = useCallback(
    async (relayClient: RelayClient, safeAddr: string): Promise<boolean> => {
      try {
        const deployed = await relayClient.getDeployed(safeAddr);
        return deployed;
      } catch (err) {
        console.warn("API check failed, falling back to RPC", err);
        if (publicClient) {
          const code = await publicClient.getBytecode({
            address: safeAddr as `0x${string}`,
          });
          return code !== undefined && code !== "0x" && code.length > 2;
        }
        return false;
      }
    },
    [publicClient],
  );

  /** Deploy the Safe using the relayClient (prompts user for signature). */
  const deploySafe = useCallback(
    async (relayClient: RelayClient): Promise<string> => {
      try {
        const response = await relayClient.deploy();
        const result = await response.wait();
        if (!result) {
          throw new Error("Safe deployment failed");
        }
        return result.proxyAddress;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to deploy Safe");
        throw error;
      }
    },
    [],
  );

  return {
    derivedSafeAddressFromEoa,
    isSafeDeployed,
    deploySafe,
  };
}
