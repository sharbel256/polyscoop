import { motion } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";
import { useTradingSession, type SessionStep } from "@/hooks/useTradingSession";
import { shortenAddress } from "@/lib/utils";
import { Spinner } from "@/components/ui";
import {
  Wallet,
  ShieldCheck,
  Key,
  CheckCircle2,
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

const STEPS: SessionStep[] = ["checking", "deploying", "credentials", "approvals", "complete"];

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

  const currentStepIndex = STEPS.indexOf(currentStep);

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground-secondary">trading session</h3>

        {isReady && (
          <button
            onClick={endTradingSession}
            className="btn-ghost text-xs text-foreground-muted"
          >
            <LogOut className="h-3.5 w-3.5" />
            end
          </button>
        )}
      </div>

      {/* Step progress */}
      {isWorking && (
        <div className="mt-3 flex gap-1">
          {STEPS.map((step, i) => (
            <motion.div
              key={step}
              className="h-1 flex-1 rounded-full"
              initial={{ opacity: 0.3 }}
              animate={{
                opacity: i <= currentStepIndex ? 1 : 0.3,
                backgroundColor:
                  i <= currentStepIndex
                    ? "rgb(75 107 255)"
                    : "rgb(var(--surface-hover))",
              }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      )}

      {/* Status */}
      <div className="mt-3 flex items-center gap-2.5">
        {isWorking ? (
          <Spinner size="sm" />
        ) : (
          <StepIcon
            className={`h-5 w-5 ${
              isReady
                ? "text-emerald-400"
                : hasError
                  ? "text-red-400"
                  : "text-foreground-muted"
            }`}
          />
        )}
        <span
          className={`text-sm font-medium ${
            isReady
              ? "text-emerald-400"
              : hasError
                ? "text-red-400"
                : "text-foreground-secondary"
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
        <div className="mt-3 space-y-1.5 text-xs text-foreground-muted">
          <div className="flex justify-between">
            <span>eoa</span>
            <span className="font-mono text-foreground-secondary">
              {shortenAddress(tradingSession.eoaAddress)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>safe</span>
            <span className="font-mono text-foreground-secondary">
              {shortenAddress(tradingSession.safeAddress)}
            </span>
          </div>
          {tradingSession.apiCredentials && (
            <div className="flex justify-between">
              <span>api key</span>
              <span className="font-mono text-foreground-secondary">
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
