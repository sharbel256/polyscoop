import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getitFetchActivity, type GetitActivity } from "@/lib/api";

export function ActivityFeed({ limit = 50 }: { limit?: number }) {
  const { token } = useAuth();
  const [entries, setEntries] = useState<GetitActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    getitFetchActivity(token, limit)
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, limit]);

  if (loading) {
    return (
      <div className="py-4 text-center text-caption text-foreground/60">
        loading activity...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="py-4 text-center text-caption text-foreground/60">
        no activity yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
        >
          <div>
            <span className="text-caption font-medium text-foreground">
              {entry.action}
            </span>
            {entry.details && (
              <span className="ml-2 text-micro text-foreground/50">
                {Object.entries(entry.details)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ")}
              </span>
            )}
          </div>
          <span className="text-micro text-foreground/40">
            {new Date(entry.created_at).toLocaleString("en-US", {
              timeZone: "America/Chicago",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>
      ))}
    </div>
  );
}
