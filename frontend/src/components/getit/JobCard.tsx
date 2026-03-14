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
              snipe at {chiDateTime(job.snipe_at)} CT
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

      {/* attempt result for non-success terminal & active states */}
      {job.status !== "success" &&
        job.status !== "cancelled" &&
        job.attempts > 0 && (
          <div className="mt-2 rounded-lg bg-foreground/5 px-3 py-2 text-caption text-foreground/60">
            <span>attempt #{job.attempts}</span>
            {!!job.result?.error && <span> — {String(job.result.error)}</span>}
            {!job.result?.error && (
              <span>
                {" — "}
                {Array.isArray(job.result?.available_slots) &&
                job.result.available_slots.length > 0
                  ? `no match (available: ${(job.result.available_slots as string[]).map((t) => formatTime12h(t)).join(", ")})`
                  : "no slots available"}
              </span>
            )}
            {job.result?.next_attempt_in != null && (
              <span className="ml-1 text-foreground/40">
                · retrying in{" "}
                {Number(job.result.next_attempt_in) >= 60
                  ? `${Math.round(Number(job.result.next_attempt_in) / 60)}min`
                  : `${Number(job.result.next_attempt_in)}s`}
              </span>
            )}
          </div>
        )}

      {/* footer */}
      <div className="mt-2 flex items-center justify-between text-micro text-foreground/50">
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
