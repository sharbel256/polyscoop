/**
 * Orchestrates the full trading session lifecycle on the client side.
 *
 * Coordinates the individual hooks for:
 *   1. RelayClient initialization (with builder remote signing)
 *   2. Safe address derivation + deployment
 *   3. User API credential derivation/creation
 *   4. Token approval checking + setting
 *
 * All signing happens in the user's browser wallet – the private key
 * never leaves the browser.
 */

import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@/providers/WalletContext";

import useUserApiCredentials from "@/hooks/useUserApiCredentials";
import useTokenApprovals from "@/hooks/useTokenApprovals";
import useSafeDeployment from "@/hooks/useSafeDeployment";
import useRelayClient from "@/hooks/useRelayClient";

import {
  loadSession,
  saveSession,
  clearSession as clearStoredSession,
  type TradingSession,
  type SessionStep,
} from "@/utils/session";

export type { SessionStep };

export function useTradingSession() {
  const [tradingSession, setTradingSession] = useState<TradingSession | null>(
    null
  );
  const [currentStep, setCurrentStep] = useState<SessionStep>("idle");
  const [sessionError, setSessionError] = useState<Error | null>(null);

  const { eoaAddress, walletClient } = useWallet();
  const { createOrDeriveUserApiCredentials } = useUserApiCredentials();
  const { checkAllTokenApprovals, setAllTokenApprovals } = useTokenApprovals();
  const { derivedSafeAddressFromEoa, isSafeDeployed, deploySafe } =
    useSafeDeployment();
  const { relayClient, initializeRelayClient, clearRelayClient } =
    useRelayClient();

  // Load any existing session when wallet connects
  useEffect(() => {
    if (!eoaAddress) {
      setTradingSession(null);
      setCurrentStep("idle");
      setSessionError(null);
      return;
    }

    const stored = loadSession(eoaAddress);
    setTradingSession(stored);

    if (!stored) {
      setCurrentStep("idle");
      setSessionError(null);
    } else if (
      stored.isSafeDeployed &&
      stored.hasApiCredentials &&
      stored.hasApprovals
    ) {
      // Restore completed session state so the UI shows "Session active"
      setCurrentStep("complete");
      setSessionError(null);
    }
  }, [eoaAddress]);

  // Restore relay client when session exists and wallet is ready
  useEffect(() => {
    if (tradingSession && !relayClient && eoaAddress && walletClient) {
      initializeRelayClient().catch((err) => {
        console.error("Failed to restore relay client:", err);
      });
    }
  }, [
    tradingSession,
    relayClient,
    eoaAddress,
    walletClient,
    initializeRelayClient,
  ]);

  const initializeTradingSession = useCallback(async () => {
    if (!eoaAddress) {
      throw new Error("Wallet not connected");
    }

    setCurrentStep("checking");
    setSessionError(null);

    try {
      const existingSession = loadSession(eoaAddress);

      // Step 1: Initialize RelayClient with builder remote signing
      const initializedRelayClient = await initializeRelayClient();

      // Step 2: Derive Safe address (deterministic from EOA)
      if (!derivedSafeAddressFromEoa) {
        throw new Error("Failed to derive Safe address");
      }

      // Step 3: Check if Safe is deployed
      let isDeployed = await isSafeDeployed(
        initializedRelayClient,
        derivedSafeAddressFromEoa
      );

      // Step 4: Deploy Safe if not already deployed
      if (!isDeployed) {
        setCurrentStep("deploying");
        await deploySafe(initializedRelayClient);
      }

      // Step 5: Get User API Credentials (derive or create)
      let apiCreds = existingSession?.apiCredentials;
      if (
        !existingSession?.hasApiCredentials ||
        !apiCreds ||
        !apiCreds.key ||
        !apiCreds.secret ||
        !apiCreds.passphrase
      ) {
        setCurrentStep("credentials");
        apiCreds = await createOrDeriveUserApiCredentials();
      }

      // Step 6: Set all required token approvals for trading
      setCurrentStep("approvals");
      const approvalStatus = await checkAllTokenApprovals(
        derivedSafeAddressFromEoa
      );

      let hasApprovals = false;
      if (approvalStatus.allApproved) {
        hasApprovals = true;
      } else {
        hasApprovals = await setAllTokenApprovals(initializedRelayClient);
      }

      // Step 7: Save session
      const newSession: TradingSession = {
        eoaAddress,
        safeAddress: derivedSafeAddressFromEoa,
        isSafeDeployed: true,
        hasApiCredentials: true,
        hasApprovals,
        apiCredentials: apiCreds,
        lastChecked: Date.now(),
      };

      setTradingSession(newSession);
      saveSession(eoaAddress, newSession);
      setCurrentStep("complete");
    } catch (err) {
      console.error("Session initialization error:", err);
      const error = err instanceof Error ? err : new Error("Unknown error");
      setSessionError(error);
      setCurrentStep("idle");
    }
  }, [
    eoaAddress,
    derivedSafeAddressFromEoa,
    initializeRelayClient,
    isSafeDeployed,
    deploySafe,
    createOrDeriveUserApiCredentials,
    checkAllTokenApprovals,
    setAllTokenApprovals,
  ]);

  const endTradingSession = useCallback(() => {
    if (!eoaAddress) return;

    clearStoredSession(eoaAddress);
    setTradingSession(null);
    clearRelayClient();
    setCurrentStep("idle");
    setSessionError(null);
  }, [eoaAddress, clearRelayClient]);

  return {
    tradingSession,
    currentStep,
    sessionError,
    isTradingSessionComplete:
      tradingSession?.isSafeDeployed &&
      tradingSession?.hasApiCredentials &&
      tradingSession?.hasApprovals,
    initializeTradingSession,
    endTradingSession,
    relayClient,
  };
}
