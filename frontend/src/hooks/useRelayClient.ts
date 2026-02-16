/**
 * Manages the RelayClient instance for Safe deployment and token approvals.
 * Uses the user's ethers signer and builder config with remote signing
 * through our backend's /signing/sign endpoint.
 */

import { useState, useCallback } from "react";
import { useWallet } from "@/providers/WalletContext";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { RelayClient } from "@polymarket/builder-relayer-client";
import {
  RELAYER_URL,
  POLYGON_CHAIN_ID,
  REMOTE_SIGNING_URL,
} from "@/constants/polymarket";

export default function useRelayClient() {
  const [relayClient, setRelayClient] = useState<RelayClient | null>(null);
  const { eoaAddress, ethersSigner } = useWallet();

  const initializeRelayClient = useCallback(async () => {
    if (!eoaAddress || !ethersSigner) {
      throw new Error("Wallet not connected");
    }

    try {
      const builderConfig = new BuilderConfig({
        remoteBuilderConfig: {
          url: REMOTE_SIGNING_URL(),
        },
      });

      const client = new RelayClient(
        RELAYER_URL,
        POLYGON_CHAIN_ID,
        ethersSigner,
        builderConfig
      );

      setRelayClient(client);
      return client;
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error("Failed to initialize relay client");
      throw error;
    }
  }, [eoaAddress, ethersSigner]);

  const clearRelayClient = useCallback(() => {
    setRelayClient(null);
  }, []);

  return {
    relayClient,
    initializeRelayClient,
    clearRelayClient,
  };
}
