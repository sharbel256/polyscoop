import { useCallback, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getitSearchVenues, type GetitVenue } from "@/lib/api";

interface VenueSearchProps {
  date: string;
  partySize: number;
  onSelectVenue: (venue: GetitVenue) => void;
  onDateChange: (date: string) => void;
  onPartySizeChange: (size: number) => void;
}

export function VenueSearch({
  date,
  partySize,
  onSelectVenue,
  onDateChange,
  onPartySizeChange,
}: VenueSearchProps) {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(false);

  const search = useCallback(
    async (q: string) => {
      if (!token || q.trim().length < 2) return;
      setLoading(true);
      setError("");
      try {
        const results = await getitSearchVenues(token, q, date, partySize);
        if (results.length > 0) {
          setSelected(true);
          setQuery(results[0].name);
          onSelectVenue(results[0]);
        } else {
          setError("no restaurants found");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "search failed");
      } finally {
        setLoading(false);
      }
    },
    [token, date, partySize, onSelectVenue],
  );

  function handleClear() {
    setQuery("");
    setError("");
    setSelected(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="restaurant name..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError("");
              if (selected) setSelected(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                search(query);
              }
            }}
            className="input w-full pr-10"
            autoComplete="off"
            spellCheck={false}
            autoCorrect="off"
          />
          <button
            type="button"
            onClick={() => (selected ? handleClear() : search(query))}
            disabled={loading || (!selected && query.trim().length < 2)}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-foreground/40 transition-colors hover:text-foreground disabled:opacity-30"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            ) : selected ? (
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
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
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
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            )}
          </button>
        </div>
        <div className="flex gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="input min-w-0 flex-1 sm:w-36"
          />
          <div className="flex items-center gap-0">
            <button
              type="button"
              onClick={() => onPartySizeChange(Math.max(1, partySize - 1))}
              disabled={partySize <= 1}
              className="flex h-10 w-10 items-center justify-center rounded-l-lg border border-r-0 border-white/10 bg-surface-dark-2 text-body text-foreground transition-colors hover:bg-surface-hover/60 disabled:opacity-30"
            >
              -
            </button>
            <span className="flex h-10 w-10 items-center justify-center border border-white/10 bg-surface-dark-2 text-caption text-foreground">
              {partySize}
            </span>
            <button
              type="button"
              onClick={() => onPartySizeChange(Math.min(6, partySize + 1))}
              disabled={partySize >= 6}
              className="flex h-10 w-10 items-center justify-center rounded-r-lg border border-l-0 border-white/10 bg-surface-dark-2 text-body text-foreground transition-colors hover:bg-surface-hover/60 disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-loss/10 px-3 py-2 text-caption text-loss">
          {error}
        </div>
      )}
    </div>
  );
}
