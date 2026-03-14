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
              snipe at {chiDateTime(job.snipe_at)} CT · 45s burst
            </div>
          )}
          {job.mode === "poll" && job.poll_interval_seconds && (
            <div className="text-micro text-foreground/40">
              polling every{" "}
              {job.poll_interval_seconds >= 60
                ? `${job.poll_interval_seconds / 60}min`
                : `${job.poll_interval_seconds}s`}
              {" · up to "}
              {(() => {
                const total = job.poll_interval_seconds * job.max_attempts;
                if (total >= 3600) return `${Math.round(total / 3600)}hr`;
                return `${Math.round(total / 60)}min`;
              })()}
            </div>
          )}
        </div>
        {canCancel ? (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="badge-red cursor-pointer"
          >
            {cancelling ? "cancelling..." : "cancel"}
          </button>
        ) : (
          <span className={STATUS_COLORS[job.status] || "badge"}>
            {job.status}
          </span>
        )}
      </div>

      {/* result */}
      {job.result && job.status === "success" && (
        <div className="mt-2 rounded-lg bg-gain/10 px-3 py-2 text-caption text-gain">
          reservation confirmed (#{String(job.result.reservation_id)})
        </div>
      )}

      {/* recent attempts */}
      {job.runs.length > 0 && (
        <div className="mt-2 space-y-1">
          {job.runs.map((run) => {
            const d = run.details as Record<string, unknown> | null;
            const result = d?.result as Record<string, unknown> | undefined;
            const error = result?.error as string | undefined;
            const slots = result?.available_slots as string[] | undefined;
            return (
              <div
                key={`${run.attempt}-${run.timestamp}`}
                className="rounded-lg bg-foreground/5 px-3 py-1.5 text-micro text-foreground/50"
              >
                <span>#{run.attempt}</span>
                {run.action === "book_success" ? (
                  <span className="text-gain"> — booked</span>
                ) : error ? (
                  <span> — {error}</span>
                ) : slots && slots.length > 0 ? (
                  <span>
                    {" — no match (available: "}
                    {slots.map((t) => formatTime12h(t)).join(", ")})
                  </span>
                ) : (
                  <span> — no slots available</span>
                )}
                <span className="ml-1 text-foreground/30">
                  {new Date(run.timestamp).toLocaleString("en-US", {
                    timeZone: "America/Chicago",
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
