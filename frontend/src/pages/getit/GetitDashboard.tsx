import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { VenueSearch } from "@/components/getit/VenueSearch";
import { SlotPicker, type SnipeRequest } from "@/components/getit/SlotPicker";
import { JobCard } from "@/components/getit/JobCard";
import {
  getitListJobs,
  getitCreateJob,
  getitStats,
  type GetitVenue,
  type GetitJob,
} from "@/lib/api";

export function GetitDashboard() {
  const { token, user, isAdmin } = useAuth();

  // search state
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [partySize, setPartySize] = useState(2);
  const [selectedVenue, setSelectedVenue] = useState<GetitVenue | null>(null);
  const [booked, setBooked] = useState<number | null>(null);
  const [slotsExpanded, setSlotsExpanded] = useState(true);

  // stats
  const [stats, setStats] = useState<{
    pending: number;
    active: number;
    scheduler_active: boolean;
  } | null>(null);

  // jobs
  const [jobs, setJobs] = useState<GetitJob[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadJobs = useCallback(() => {
    if (!token) return;
    setRefreshing(true);
    Promise.all([
      getitListJobs(token)
        .then(setJobs)
        .catch(() => {}),
      getitStats(token)
        .then(setStats)
        .catch(() => {}),
    ]).finally(() => setRefreshing(false));
  }, [token]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // auto-refresh every 10s when there's an active job
  const hasActiveJob = jobs.some(
    (j) => j.status === "pending" || j.status === "active",
  );
  useEffect(() => {
    if (!hasActiveJob) return;
    const id = setInterval(loadJobs, 10_000);
    return () => clearInterval(id);
  }, [hasActiveJob, loadJobs]);

  // auto-collapse slots when a job starts, expand when it clears (admins stay expanded)
  useEffect(() => {
    setSlotsExpanded(isAdmin || !hasActiveJob);
  }, [hasActiveJob, isAdmin]);

  // schedule job from slot picker
  async function handleSchedule(req: SnipeRequest) {
    if (!token || !selectedVenue) return;
    try {
      await getitCreateJob(token, {
        venue_name: selectedVenue.name,
        venue_id: selectedVenue.venue_id,
        date,
        desired_time: req.desired_time,
        party_size: partySize,
        mode: req.mode,
        snipe_at: req.snipe_at ?? undefined,
        poll_interval_seconds: req.poll_interval_seconds ?? undefined,
        time_flex_minutes: req.time_flex_minutes,
        max_attempts: req.max_attempts,
      });
      loadJobs();
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-8">
      {/* status bar */}
      {user && (
        <div className="card p-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${user.resy_connected ? "bg-gain" : "bg-loss"}`}
              />
              <span className="text-caption text-foreground/60">
                {user.resy_connected ? "resy connected" : "resy disconnected"}
              </span>
              {user.resy_token_updated_at && (
                <span className="text-micro text-foreground/40">
                  refreshed token{" "}
                  {new Date(user.resy_token_updated_at).toLocaleString(
                    "en-US",
                    {
                      timeZone: "America/Chicago",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    },
                  )}
                </span>
              )}
            </div>
            {stats && (
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${stats.scheduler_active ? "bg-gain" : "bg-loss"}`}
                />
                <span className="text-caption text-foreground/60">
                  scheduler {stats.scheduler_active ? "active" : "inactive"}
                </span>
                {(stats.pending > 0 || stats.active > 0) && (
                  <span className="text-micro text-foreground/40">
                    {stats.pending} pending {stats.active} running - across all
                    users
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* search */}
      <div className="card p-4">
        <h2 className="mb-4 text-h3 text-foreground">find a table</h2>
        <VenueSearch
          date={date}
          partySize={partySize}
          onSelectVenue={(v) => {
            setSelectedVenue(v);
            setBooked(null);
          }}
          onDateChange={setDate}
          onPartySizeChange={setPartySize}
        />
      </div>

      {/* slots */}
      {selectedVenue && !booked && (
        <div className="card p-4">
          <button
            type="button"
            onClick={() => setSlotsExpanded((v) => !v)}
            className="flex w-full items-center gap-3"
          >
            {selectedVenue.images[0] && (
              <img
                src={selectedVenue.images[0]}
                alt={selectedVenue.name}
                className="h-10 w-10 rounded-md object-cover"
              />
            )}
            <div className="text-left">
              <h3 className="text-body font-semibold text-foreground">
                {selectedVenue.name}
              </h3>
              <p className="text-micro text-foreground/50">
                {selectedVenue.region}
                {selectedVenue.cuisine.length > 0 &&
                  ` · ${selectedVenue.cuisine.join(", ")}`}
              </p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`ml-auto text-foreground/30 transition-transform ${slotsExpanded ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {slotsExpanded && (
            <div className="mt-4">
              <SlotPicker
                venue={selectedVenue}
                date={date}
                partySize={partySize}
                onBooked={(id) => {
                  setBooked(id);
                  loadJobs();
                }}
                onSchedule={handleSchedule}
                disabled={hasActiveJob && !isAdmin}
              />
            </div>
          )}
        </div>
      )}

      {/* booking confirmation */}
      {booked && (
        <div className="card border-gain/30 bg-gain/5 p-4">
          <h3 className="text-body font-semibold text-gain">
            reservation confirmed!
          </h3>
          <p className="text-caption text-foreground/60">
            reservation #{booked} at {selectedVenue?.name}
          </p>
        </div>
      )}

      {/* your jobs */}
      {jobs.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-h3 text-foreground">your jobs</h2>
            <div className="flex-1" />
            <button
              onClick={loadJobs}
              className="inline-flex items-center justify-center rounded-lg p-1.5 text-foreground/40 transition-colors hover:bg-surface-hover/60 hover:text-foreground"
              title="refresh"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={refreshing ? "animate-spin" : ""}
              >
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>
          </div>
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} onUpdated={loadJobs} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
