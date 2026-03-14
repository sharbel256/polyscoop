import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

function to12h(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "pm" : "am";
  return `${((hour + 11) % 12) + 1}:${m}${suffix}`;
}
import {
  getitFetchSlots,
  getitBook,
  type GetitSlot,
  type GetitVenue,
} from "@/lib/api";

export interface SnipeRequest {
  desired_time: string;
  mode: "snipe" | "poll";
  snipe_at: string | null;
  poll_interval_seconds: number | null;
  time_flex_minutes: number;
  max_attempts: number;
}

interface SlotPickerProps {
  venue: GetitVenue;
  date: string;
  partySize: number;
  onBooked: (reservationId: number) => void;
  onSchedule: (req: SnipeRequest) => void;
  disabled?: boolean;
}

export function SlotPicker({
  venue,
  date,
  partySize,
  onBooked,
  onSchedule,
  disabled,
}: SlotPickerProps) {
  const { token } = useAuth();
  const [slots, setSlots] = useState<GetitSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<string | null>(null);
  const [error, setError] = useState("");

  // snipe form state
  const [desiredTime, setDesiredTime] = useState("19:00");
  const [mode, setMode] = useState<"snipe" | "poll">("snipe");
  const [snipeAt, setSnipeAt] = useState("");
  const [pollInterval, setPollInterval] = useState(60);
  const [pollDuration, setPollDuration] = useState(3600); // seconds (default 1h)
  const [flexEnabled, setFlexEnabled] = useState(false);
  const [flexMinutes, setFlexMinutes] = useState(60);
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");
    getitFetchSlots(token, venue.venue_id, date, partySize)
      .then((res) => {
        console.log("[SlotPicker] fetched slots:", res);
        setSlots(res);
      })
      .catch((err) => {
        console.error("[SlotPicker] error:", err);
        setError(err instanceof Error ? err.message : "failed");
      })
      .finally(() => setLoading(false));
  }, [token, venue.venue_id, date, partySize]);

  async function handleBook(slot: GetitSlot) {
    if (!token) return;
    setBooking(slot.config_token);
    setError("");
    try {
      const res = await getitBook(token, {
        venue_id: venue.venue_id,
        config_token: slot.config_token,
        date,
        party_size: partySize,
      });
      onBooked(res.reservation_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "booking failed");
    } finally {
      setBooking(null);
    }
  }

  function handleScheduleSubmit() {
    setScheduling(true);
    onSchedule({
      desired_time: desiredTime,
      mode,
      snipe_at:
        mode === "snipe" && snipeAt ? new Date(snipeAt).toISOString() : null,
      poll_interval_seconds: mode === "poll" ? pollInterval : null,
      time_flex_minutes: flexEnabled ? flexMinutes : 0,
      max_attempts:
        mode === "snipe" ? 20 : Math.ceil(pollDuration / pollInterval),
    });
    setScheduling(false);
  }

  return (
    <div className="space-y-4">
      {/* available slots */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-body font-medium text-foreground">
            available slots
          </h3>
          <span className="text-caption text-foreground/60">
            {loading ? "..." : `${slots.length} found`}
          </span>
        </div>

        {error && (
          <div className="rounded-lg bg-loss/10 px-3 py-2 text-caption text-loss">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-6 text-center text-caption text-foreground/60">
            loading slots...
          </div>
        ) : slots.length === 0 ? (
          <p className="text-caption text-foreground/50">
            no slots available — schedule a snipe below
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {slots.map((slot) => (
              <div
                key={slot.config_token}
                className="card flex flex-col items-center gap-2 p-3"
              >
                <span className="text-body font-semibold text-foreground">
                  {to12h(slot.time.slice(0, 5))}
                </span>
                <span className="text-micro text-foreground/50">
                  {slot.type}
                </span>
                <button
                  onClick={() => handleBook(slot)}
                  disabled={booking === slot.config_token}
                  className="btn-primary px-3 py-1 text-micro"
                >
                  {booking === slot.config_token ? "..." : "book"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* schedule a snipe */}
      <div className="border-t border-white/10 pt-4">
        <h3 className="mb-3 text-body font-medium text-foreground">
          schedule a snipe
        </h3>
        <div className="min-w-0 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-micro text-foreground/50">
                desired time
              </label>
              <input
                type="time"
                value={desiredTime}
                onChange={(e) => setDesiredTime(e.target.value)}
                className="input min-w-0"
              />
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFlexEnabled(false)}
                  className={`rounded-full px-2.5 py-0.5 text-micro transition-colors ${
                    !flexEnabled
                      ? "bg-brand-500/20 text-brand-400"
                      : "bg-white/5 text-foreground/40 hover:bg-white/10"
                  }`}
                >
                  exact
                </button>
                {[15, 30, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      setFlexEnabled(true);
                      setFlexMinutes(mins);
                    }}
                    className={`rounded-full px-2.5 py-0.5 text-micro transition-colors ${
                      flexEnabled && flexMinutes === mins
                        ? "bg-brand-500/20 text-brand-400"
                        : "bg-white/5 text-foreground/40 hover:bg-white/10"
                    }`}
                  >
                    ± {mins}m
                  </button>
                ))}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-micro text-foreground/50">
                mode
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setMode("snipe")}
                  className={`flex-1 rounded-lg px-3 py-2 text-caption transition-colors ${
                    mode === "snipe"
                      ? "bg-brand-500/20 text-brand-400"
                      : "bg-white/5 text-foreground/60 hover:bg-white/10"
                  }`}
                >
                  snipe
                </button>
                <button
                  type="button"
                  onClick={() => setMode("poll")}
                  className={`flex-1 rounded-lg px-3 py-2 text-caption transition-colors ${
                    mode === "poll"
                      ? "bg-brand-500/20 text-brand-400"
                      : "bg-white/5 text-foreground/60 hover:bg-white/10"
                  }`}
                >
                  poll
                </button>
              </div>
            </div>
          </div>

          {mode === "snipe" && (
            <div className="min-w-0">
              <label className="mb-1 block text-micro text-foreground/50">
                snipe at (when reservations open)
              </label>
              <input
                type="datetime-local"
                value={snipeAt}
                onChange={(e) => setSnipeAt(e.target.value)}
                className="input min-h-[2.75rem] min-w-0"
              />
            </div>
          )}

          {mode === "poll" &&
            (() => {
              const MAX_ATTEMPTS = 300;
              const intervals: [number, string][] = [
                [60, "1 min"],
                [300, "5 min"],
              ];
              const durations: [number, string][] = [
                [3600, "1 hr"],
                [10800, "3 hr"],
                [18000, "5 hr"],
                [43200, "12 hr"],
                [86400, "24 hr"],
              ];
              const allowedDurations = durations.filter(
                ([d]) => Math.ceil(d / pollInterval) <= MAX_ATTEMPTS,
              );
              const attempts = Math.ceil(pollDuration / pollInterval);
              return (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-micro text-foreground/50">
                      check every
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {intervals.map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            setPollInterval(val);
                            const maxDur = MAX_ATTEMPTS * val;
                            if (pollDuration > maxDur) {
                              const nearest = durations
                                .filter(([d]) => d <= maxDur)
                                .pop();
                              if (nearest) setPollDuration(nearest[0]);
                            }
                          }}
                          className={`rounded-full px-3 py-1 text-caption transition-colors ${
                            pollInterval === val
                              ? "bg-brand-500/20 text-brand-400"
                              : "bg-white/5 text-foreground/40 hover:bg-white/10"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-micro text-foreground/50">
                      for
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {allowedDurations.map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setPollDuration(val)}
                          className={`rounded-full px-3 py-1 text-caption transition-colors ${
                            pollDuration === val
                              ? "bg-brand-500/20 text-brand-400"
                              : "bg-white/5 text-foreground/40 hover:bg-white/10"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-micro text-foreground/30">
                    {attempts} attempts
                  </p>
                </div>
              );
            })()}

          <button
            onClick={handleScheduleSubmit}
            disabled={
              scheduling ||
              !desiredTime ||
              (mode === "snipe" && !snipeAt) ||
              disabled
            }
            className="btn-primary w-full"
          >
            {disabled
              ? "cancel active job first"
              : scheduling
                ? "scheduling..."
                : "schedule job"}
          </button>
        </div>
      </div>
    </div>
  );
}
