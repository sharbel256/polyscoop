import { useCallback, useEffect, useRef, useState } from "react";
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
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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

  useEffect(() => {
    if (selected) return;
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) return;
    debounceRef.current = setTimeout(() => search(query), 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, search, selected]);

  function handleChange(value: string) {
    setQuery(value);
    setError("");
    if (selected) setSelected(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="restaurant name..."
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            className="input w-full"
            autoComplete="off"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
          )}
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="input w-full sm:w-36"
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

      {error && (
        <div className="rounded-lg bg-loss/10 px-3 py-2 text-caption text-loss">
          {error}
        </div>
      )}
    </div>
  );
}
