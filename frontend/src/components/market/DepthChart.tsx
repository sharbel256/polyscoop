import type { OrderbookAnalysis } from "@/lib/api";

interface DepthChartProps {
  orderbook: OrderbookAnalysis;
}

export function DepthChart({ orderbook }: DepthChartProps) {
  const { bids, asks } = orderbook;

  if (bids.length === 0 && asks.length === 0) {
    return (
      <div className="card flex items-center justify-center py-16 text-sm text-gray-500">
        no orderbook data
      </div>
    );
  }

  const W = 600;
  const H = 180;
  const PAD = { top: 16, right: 16, bottom: 24, left: 50 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const midX = PAD.left + plotW / 2;

  // Build cumulative depth from bids (sorted high→low) and asks (sorted low→high)
  const sortedBids = [...bids]
    .map((b) => ({ price: parseFloat(b.price), size: parseFloat(b.size) }))
    .sort((a, b) => b.price - a.price);
  const sortedAsks = [...asks]
    .map((a) => ({ price: parseFloat(a.price), size: parseFloat(a.size) }))
    .sort((a, b) => a.price - b.price);

  const cumBids: { price: number; cumSize: number }[] = [];
  let cum = 0;
  for (const b of sortedBids) {
    cum += b.size;
    cumBids.push({ price: b.price, cumSize: cum });
  }

  const cumAsks: { price: number; cumSize: number }[] = [];
  cum = 0;
  for (const a of sortedAsks) {
    cum += a.size;
    cumAsks.push({ price: a.price, cumSize: cum });
  }

  const maxDepth = Math.max(
    cumBids[cumBids.length - 1]?.cumSize ?? 0,
    cumAsks[cumAsks.length - 1]?.cumSize ?? 0,
    1,
  );

  const toY = (depth: number) => PAD.top + plotH - (depth / maxDepth) * plotH;

  // Bids go from midX to left
  const bidPath =
    cumBids.length > 0
      ? `M${midX},${PAD.top + plotH} ` +
        cumBids
          .map((b, i) => {
            const x = midX - ((i + 1) / cumBids.length) * (plotW / 2);
            return `L${x},${toY(b.cumSize)}`;
          })
          .join(" ") +
        ` L${PAD.left},${PAD.top + plotH} Z`
      : "";

  // Asks go from midX to right
  const askPath =
    cumAsks.length > 0
      ? `M${midX},${PAD.top + plotH} ` +
        cumAsks
          .map((a, i) => {
            const x = midX + ((i + 1) / cumAsks.length) * (plotW / 2);
            return `L${x},${toY(a.cumSize)}`;
          })
          .join(" ") +
        ` L${W - PAD.right},${PAD.top + plotH} Z`
      : "";

  return (
    <div className="card">
      <h3 className="mb-3 text-sm font-semibold text-gray-300">depth chart</h3>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Center line */}
        <line
          x1={midX}
          y1={PAD.top}
          x2={midX}
          y2={PAD.top + plotH}
          stroke="#4b5563"
          strokeWidth={0.5}
          strokeDasharray="4 2"
        />

        {/* Bid area */}
        {bidPath && (
          <path d={bidPath} fill="#10b98120" stroke="#10b981" strokeWidth={1} />
        )}

        {/* Ask area */}
        {askPath && (
          <path d={askPath} fill="#ef444420" stroke="#ef4444" strokeWidth={1} />
        )}

        {/* Labels */}
        <text
          x={PAD.left + 4}
          y={PAD.top + 12}
          className="fill-emerald-400"
          fontSize={10}
        >
          bids
        </text>
        <text
          x={W - PAD.right - 4}
          y={PAD.top + 12}
          textAnchor="end"
          className="fill-red-400"
          fontSize={10}
        >
          asks
        </text>
      </svg>
    </div>
  );
}
