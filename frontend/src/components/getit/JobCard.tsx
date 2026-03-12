import { useAuth } from "@/hooks/useAuth";
import { getitCancelJob, type GetitJob } from "@/lib/api";
import { useState } from "react";

const STATUS_COLORS: Record<string, string> = {
  pending: "badge-blue",
  active: "badge-blue",
  success: "badge-green",
  failed: "badge-red",
  exhausted: "badge-gray",
  cancelled: "badge-gray",
};

const CHI_FMT: Intl.DateTimeFormatOptions = {
  timeZone: "America/Chicago",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

const CHI_TIME: Intl.DateTimeFormatOptions = {
  timeZone: "America/Chicago",
  hour: "numeric",
  minute: "2-digit",
};

function chiTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", CHI_TIME);
}

function chiDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", CHI_FMT);
}

function formatTime12h(time24: string) {
  const [h, m] = time24.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

interface JobCardProps {
  job: GetitJob;
  onUpdated: () => void;
}

export function JobCard({ job, onUpdated }: JobCardProps) {
  const { token } = useAuth();
  const [cancelling, setCancelling] = useState(false);

  async function handleCancel() {
    if (!token) return;
    setCancelling(true);
    try {
      await getitCancelJob(token, job.id);
      onUpdated();
    } catch {
      // ignore
    } finally {
      setCancelling(false);
    }
  }

  const canCancel = job.status === "pending" || job.status === "active";

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-body font-medium text-foreground">
            {job.venue_name}
          </div>
          <div className="text-caption text-foreground/60">
            {job.date} at {formatTime12h(job.desired_time)} · {job.party_size}{" "}
            guests · {job.mode}
            {job.time_flex_minutes > 0 && ` · ±${job.time_flex_minutes}min`}
          </div>
          {/* snipe/poll details */}
          {job.mode === "snipe" && job.snipe_at && (
            <div className="text-micro text-foreground/40">
              snipe at {chiDateTime(job.snipe_at)} CT
            </div>
          )}
          {job.mode === "poll" && job.poll_interval_seconds && (
            <div className="text-micro text-foreground/40">
              polling every{" "}
              {job.poll_interval_seconds >= 60
                ? `${job.poll_interval_seconds / 60}min`
                : `${job.poll_interval_seconds}s`}
            </div>
          )}
        </div>
        <span className={STATUS_COLORS[job.status] || "badge"}>
          {job.status}
        </span>
      </div>

      {/* result */}
      {job.result && job.status === "success" && (
        <div className="mt-2 rounded-lg bg-gain/10 px-3 py-2 text-caption text-gain">
          reservation confirmed (#{String(job.result.reservation_id)})
        </div>
      )}
      {job.status === "failed" && (
        <div className="mt-2 rounded-lg bg-loss/10 px-3 py-2 text-caption text-loss">
          failed —{" "}
          {String(job.result?.error ?? `error after ${job.attempts} attempts`)}
        </div>
      )}
      {job.status === "exhausted" && (
        <div className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-caption text-foreground/50">
          no slots found after {job.attempts} attempts
        </div>
      )}

      {/* last 5 runs */}
      {job.runs && job.runs.length > 0 && (
        <div className="mt-3 space-y-1">
          <div className="text-micro font-medium text-foreground/50">
            recent runs
          </div>
          {job.runs.map((run, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-micro text-foreground/40"
            >
              <span
                className={
                  run.action === "book_success"
                    ? "text-gain"
                    : run.action === "book_failed"
                      ? "text-loss"
                      : ""
                }
              >
                {run.action === "book_success"
                  ? "success"
                  : run.action === "book_failed"
                    ? "failed"
                    : `attempt #${run.attempt}`}
              </span>
              <span>{chiTime(run.timestamp)}</span>
            </div>
          ))}
        </div>
      )}

      {/* footer */}
      <div className="mt-2 flex items-center justify-between text-micro text-foreground/50">
        <span>
          {job.attempts}/{job.max_attempts} attempts
        </span>
        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="btn-ghost text-loss"
          >
            {cancelling ? "cancelling..." : "cancel job"}
          </button>
        )}
      </div>
    </div>
  );
}
