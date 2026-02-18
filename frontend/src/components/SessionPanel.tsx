import { useWallet } from "@/hooks/useWallet";
import { useTradingSession, type SessionStep } from "@/hooks/useTradingSession";
import { shortenAddress } from "@/lib/utils";
import {
  Wallet,
  ShieldCheck,
  Key,
  CheckCircle2,
  Loader2,
  AlertCircle,
  LogOut,
} from "lucide-react";

const STEP_INFO: Record<SessionStep, { label: string; icon: typeof Wallet }> = {
  idle: { label: "not started", icon: Wallet },
  checking: { label: "checking session...", icon: Wallet },
  deploying: { label: "deploying safe...", icon: ShieldCheck },
  credentials: { label: "getting api credentials...", icon: Key },
  approvals: { label: "setting token approvals...", icon: ShieldCheck },
  complete: { label: "session active", icon: CheckCircle2 },
};

export function SessionPanel() {
  const { isConnected } = useWallet();
  const {
    tradingSession,
    currentStep,
    sessionError,
    isTradingSessionComplete,
    initializeTradingSession,
    endTradingSession,
  } = useTradingSession();

  if (!isConnected) return null;

  const hasError = sessionError !== null;
  const info = STEP_INFO[currentStep];
  const StepIcon = hasError ? AlertCircle : info.icon;
  const isWorking = !["idle", "complete"].includes(currentStep) && !hasError;
  const isReady = currentStep === "complete" && isTradingSessionComplete;

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">trading session</h3>

        {isReady && (
          <button
            onClick={endTradingSession}
            className="btn-ghost text-xs text-gray-500"
          >
            <LogOut className="h-3.5 w-3.5" />
            end
          </button>
        )}
      </div>

      {/* Status */}
      <div className="mt-3 flex items-center gap-2.5">
        {isWorking ? (
          <Loader2 className="h-5 w-5 animate-spin text-brand-400" />
        ) : (
          <StepIcon
            className={`h-5 w-5 ${
              isReady
                ? "text-emerald-400"
                : hasError
                  ? "text-red-400"
                  : "text-gray-500"
            }`}
          />
        )}
        <span
          className={`text-sm font-medium ${
            isReady
              ? "text-emerald-400"
              : hasError
                ? "text-red-400"
                : "text-gray-400"
          }`}
        >
          {hasError ? "error" : info.label}
        </span>
      </div>

      {/* Error message */}
      {sessionError && (
        <p className="mt-2 text-xs text-red-400/80">{sessionError.message}</p>
      )}

      {/* Session info */}
      {tradingSession && (
        <div className="mt-3 space-y-1.5 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>eoa</span>
            <span className="font-mono text-gray-400">
              {shortenAddress(tradingSession.eoaAddress)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>safe</span>
            <span className="font-mono text-gray-400">
              {shortenAddress(tradingSession.safeAddress)}
            </span>
          </div>
          {tradingSession.apiCredentials && (
            <div className="flex justify-between">
              <span>api key</span>
              <span className="font-mono text-gray-400">
                {tradingSession.apiCredentials.key.slice(0, 8)}...
              </span>
            </div>
          )}
        </div>
      )}

      {/* Initialize button */}
      {currentStep === "idle" && !hasError && (
        <button
          onClick={initializeTradingSession}
          className="btn-primary mt-4 w-full"
        >
          <ShieldCheck className="h-4 w-4" />
          initialize trading session
        </button>
      )}

      {hasError && (
        <button
          onClick={initializeTradingSession}
          className="btn-primary mt-4 w-full"
        >
          retry
        </button>
      )}
    </div>
  );
}
