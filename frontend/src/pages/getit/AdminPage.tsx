import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ActivityFeed } from "@/components/getit/ActivityFeed";
import {
  getitAdminListUsers,
  getitAdminUpdateUser,
  getitAdminWorkerStatus,
  getitAdminToggleWorker,
  getitAdminListJobs,
  getitAdminDebugFind,
  getitCancelJob,
  type GetitAdminUser,
  type GetitJob,
  type GetitWorkerStatus,
} from "@/lib/api";

const PAGE_SIZE = 10;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-brand-500/20 text-brand-400",
  active: "bg-brand-500/20 text-brand-400",
  success: "bg-gain/20 text-gain",
  failed: "bg-loss/20 text-loss",
  cancelled: "bg-foreground/10 text-foreground/40",
};

function Pagination({
  page,
  total,
  onPage,
}: {
  page: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-between text-caption">
      <span className="text-foreground/40">
        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of{" "}
        {total}
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="btn-ghost px-2 py-1 text-micro disabled:opacity-30"
        >
          prev
        </button>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="btn-ghost px-2 py-1 text-micro disabled:opacity-30"
        >
          next
        </button>
      </div>
    </div>
  );
}

export function AdminPage() {
  const { token, isAdmin } = useAuth();
  const [users, setUsers] = useState<GetitAdminUser[]>([]);
  const [jobs, setJobs] = useState<GetitJob[]>([]);
  const [workers, setWorkers] = useState<GetitWorkerStatus>({
    resy_scheduler: false,
  });
  const [togglingWorker, setTogglingWorker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userPage, setUserPage] = useState(1);
  const [jobPage, setJobPage] = useState(1);
  const [jobFilter, setJobFilter] = useState("all");
  const [findResult, setFindResult] = useState<{
    jobId: string;
    status_code: number;
    body: string;
  } | null>(null);
  const [findLoading, setFindLoading] = useState<string | null>(null);

  const loadAll = useCallback(() => {
    if (!token || !isAdmin) return;
    setLoading(true);
    Promise.all([
      getitAdminListUsers(token),
      getitAdminListJobs(token),
      getitAdminWorkerStatus(token),
    ])
      .then(([u, j, w]) => {
        setUsers(u);
        setJobs(j);
        setWorkers(w);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, isAdmin]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function toggleFlag(
    userId: string,
    flag: "is_admin" | "is_active",
    current: boolean,
  ) {
    if (!token) return;
    try {
      const updated = await getitAdminUpdateUser(token, userId, {
        [flag]: !current,
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    } catch {
      // ignore
    }
  }

  async function handleToggleWorker(key: "resy_scheduler", current: boolean) {
    if (!token) return;
    setTogglingWorker(true);
    try {
      const updated = await getitAdminToggleWorker(token, {
        [key]: !current,
      } as { resy_scheduler: boolean });
      setWorkers(updated);
    } catch {
      // ignore
    } finally {
      setTogglingWorker(false);
    }
  }

  async function handleCancelJob(jobId: string) {
    if (!token) return;
    try {
      await getitCancelJob(token, jobId);
      loadAll();
    } catch {
      // ignore
    }
  }

  async function handleDebugFind(jobId: string) {
    if (!token) return;
    setFindLoading(jobId);
    try {
      const res = await getitAdminDebugFind(token, jobId);
      setFindResult({ jobId, ...res });
    } catch {
      setFindResult({ jobId, status_code: 0, body: "request failed" });
    } finally {
      setFindLoading(null);
    }
  }

  if (!isAdmin) {
    return (
      <div className="py-16 text-center text-caption text-foreground/60">
        admin access required
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  // users pagination
  const pagedUsers = users.slice(
    (userPage - 1) * PAGE_SIZE,
    userPage * PAGE_SIZE,
  );

  // jobs filtering + pagination
  const filteredJobs =
    jobFilter === "all" ? jobs : jobs.filter((j) => j.status === jobFilter);
  const pagedJobs = filteredJobs.slice(
    (jobPage - 1) * PAGE_SIZE,
    jobPage * PAGE_SIZE,
  );
  const jobStatuses = [
    "all",
    "pending",
    "active",
    "success",
    "exhausted",
    "failed",
    "cancelled",
  ];

  return (
    <div className="space-y-8">
      {/* workers */}
      <section className="card p-4">
        <h2 className="mb-4 text-h3 text-foreground">workers</h2>
        <div className="flex items-center justify-between">
          <span className="text-caption text-foreground">resy scheduler</span>
          <button
            onClick={() =>
              handleToggleWorker("resy_scheduler", workers.resy_scheduler)
            }
            disabled={togglingWorker}
            className={`rounded px-3 py-1 text-micro transition-colors ${
              workers.resy_scheduler
                ? "bg-gain/20 text-gain"
                : "bg-foreground/10 text-foreground/40 hover:bg-foreground/20"
            }`}
          >
            {workers.resy_scheduler ? "running" : "stopped"}
          </button>
        </div>
      </section>

      {/* users table */}
      <section className="card p-4">
        <h2 className="mb-4 text-h3 text-foreground">users ({users.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-caption">
            <thead>
              <tr className="border-b border-white/10 text-foreground/50">
                <th className="px-3 py-2">email</th>
                <th className="px-3 py-2">admin</th>
                <th className="px-3 py-2">active</th>
                <th className="px-3 py-2">joined</th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-white/5 text-foreground"
                >
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => toggleFlag(u.id, "is_admin", u.is_admin)}
                      className={`rounded px-2 py-0.5 text-micro transition-colors ${
                        u.is_admin
                          ? "bg-brand-500/20 text-brand-400"
                          : "bg-foreground/10 text-foreground/40 hover:bg-foreground/20"
                      }`}
                    >
                      {u.is_admin ? "yes" : "no"}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => toggleFlag(u.id, "is_active", u.is_active)}
                      className={`rounded px-2 py-0.5 text-micro transition-colors ${
                        u.is_active
                          ? "bg-gain/20 text-gain"
                          : "bg-loss/20 text-loss hover:bg-loss/30"
                      }`}
                    >
                      {u.is_active ? "yes" : "no"}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-foreground/50">
                    {new Date(u.created_at).toLocaleDateString("en-US", {
                      timeZone: "America/Chicago",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={userPage} total={users.length} onPage={setUserPage} />
      </section>

      {/* all jobs */}
      <section className="card p-4">
        <h2 className="mb-4 text-h3 text-foreground">
          jobs ({filteredJobs.length})
        </h2>

        {/* filter tabs */}
        <div className="mb-4 flex flex-wrap gap-1">
          {jobStatuses.map((s) => {
            const count =
              s === "all"
                ? jobs.length
                : jobs.filter((j) => j.status === s).length;
            return (
              <button
                key={s}
                onClick={() => {
                  setJobFilter(s);
                  setJobPage(1);
                }}
                className={`rounded-full px-3 py-1 text-micro transition-colors ${
                  jobFilter === s
                    ? "bg-brand-500/20 text-brand-400"
                    : "text-foreground/50 hover:text-foreground"
                }`}
              >
                {s} ({count})
              </button>
            );
          })}
        </div>

        {pagedJobs.length === 0 ? (
          <p className="py-4 text-center text-caption text-foreground/50">
            no jobs found
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-caption">
              <thead>
                <tr className="border-b border-white/10 text-foreground/50">
                  <th className="px-3 py-2">venue</th>
                  <th className="px-3 py-2">date / time</th>
                  <th className="px-3 py-2">mode</th>
                  <th className="px-3 py-2">status</th>
                  <th className="px-3 py-2">attempts</th>
                  <th className="px-3 py-2">created</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {pagedJobs.map((job) => {
                  const canCancel =
                    job.status === "pending" || job.status === "active";
                  return (
                    <tr
                      key={job.id}
                      className="border-b border-white/5 text-foreground"
                    >
                      <td className="px-3 py-2">
                        <div className="font-medium">{job.venue_name}</div>
                        <div className="text-micro text-foreground/40">
                          {job.party_size} guests
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {job.date} {job.desired_time}
                      </td>
                      <td className="px-3 py-2">{job.mode}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-micro ${STATUS_COLORS[job.status] || ""}`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-foreground/50">
                        {job.attempts}/{job.max_attempts}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-foreground/50">
                        {new Date(job.created_at).toLocaleString("en-US", {
                          timeZone: "America/Chicago",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDebugFind(job.id)}
                            disabled={findLoading === job.id}
                            className="rounded px-2 py-0.5 text-micro text-brand-400 transition-colors hover:bg-brand-500/10"
                          >
                            {findLoading === job.id ? "..." : "find"}
                          </button>
                          {canCancel && (
                            <button
                              onClick={() => handleCancelJob(job.id)}
                              className="rounded px-2 py-0.5 text-micro text-loss transition-colors hover:bg-loss/10"
                            >
                              cancel
                            </button>
                          )}
                          {job.status === "success" && job.result && (
                            <span className="text-micro text-gain">
                              #{String(job.result.reservation_id)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={jobPage}
          total={filteredJobs.length}
          onPage={setJobPage}
        />

        {findResult && (
          <div className="mt-4 rounded-lg border border-white/10 bg-surface-dark-2 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-caption text-foreground/60">
                /4/find — HTTP {findResult.status_code}
              </span>
              <button
                onClick={() => setFindResult(null)}
                className="text-micro text-foreground/40 hover:text-foreground"
              >
                close
              </button>
            </div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-micro text-foreground/80">
              {findResult.body}
            </pre>
          </div>
        )}
      </section>

      {/* activity */}
      <section className="card p-4">
        <h2 className="mb-4 text-h3 text-foreground">activity log</h2>
        <ActivityFeed limit={100} />
      </section>
    </div>
  );
}
