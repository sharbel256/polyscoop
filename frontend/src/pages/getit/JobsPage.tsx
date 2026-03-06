import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { JobCard } from "@/components/getit/JobCard";
import { getitListJobs, type GetitJob } from "@/lib/api";

export function JobsPage() {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<GetitJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const loadJobs = useCallback(() => {
    if (!token) return;
    setLoading(true);
    getitListJobs(token)
      .then(setJobs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const filtered =
    filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  const statuses = [
    "all",
    "pending",
    "active",
    "success",
    "failed",
    "cancelled",
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-h2 text-foreground">booking jobs</h1>

      {/* filter tabs */}
      <div className="flex gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-caption transition-colors ${
              filter === s
                ? "bg-brand-500/20 text-brand-400"
                : "text-foreground/50 hover:text-foreground"
            }`}
          >
            {s}
            {s !== "all" && (
              <span className="ml-1 text-micro">
                ({jobs.filter((j) => j.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 text-center text-caption text-foreground/60">
          loading jobs...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-caption text-foreground/60">
          no jobs found
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} onUpdated={loadJobs} />
          ))}
        </div>
      )}
    </div>
  );
}
