import type { PricePoint } from "@/lib/api";

interface PriceChartProps {
  history: PricePoint[];
}

export function PriceChart({ history }: PriceChartProps) {
  if (history.length < 2) {
    return (
      <div className="card flex items-center justify-center py-16 text-sm text-gray-500">
        not enough data for chart
      </div>
    );
  }

  const W = 600;
  const H = 200;
  const PAD = { top: 20, right: 16, bottom: 30, left: 50 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const prices = history.map((p) => p.p);
  const times = history.map((p) => p.t);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const minT = Math.min(...times);
  const maxT = Math.max(...times);

  const rangeP = maxP - minP || 0.01;
  const rangeT = maxT - minT || 1;

  const toX = (t: number) => PAD.left + ((t - minT) / rangeT) * plotW;
  const toY = (p: number) => PAD.top + plotH - ((p - minP) / rangeP) * plotH;

  const linePath = history
    .map((pt, i) => `${i === 0 ? "M" : "L"}${toX(pt.t)},${toY(pt.p)}`)
    .join(" ");

  const areaPath = `${linePath} L${toX(history[history.length - 1].t)},${PAD.top + plotH} L${toX(history[0].t)},${PAD.top + plotH} Z`;

  const latestPrice = prices[prices.length - 1];
  const firstPrice = prices[0];
  const isUp = latestPrice >= firstPrice;
  const strokeColor = isUp ? "#10b981" : "#ef4444";
  const fillColor = isUp ? "#10b98115" : "#ef444415";

  // Y-axis labels
  const yTicks = 5;
  const yLabels = Array.from({ length: yTicks }, (_, i) => {
    const p = minP + (rangeP * i) / (yTicks - 1);
    return { p, y: toY(p) };
  });

  // X-axis labels
  const xTicks = Math.min(5, history.length);
  const xLabels = Array.from({ length: xTicks }, (_, i) => {
    const idx = Math.floor((i * (history.length - 1)) / (xTicks - 1));
    const pt = history[idx];
    return { t: pt.t, x: toX(pt.t) };
  });

  return (
    <div className="card">
      <h3 className="mb-3 text-sm font-semibold text-gray-300">
        price history
      </h3>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {yLabels.map(({ p, y }) => (
          <g key={p}>
            <line
              x1={PAD.left}
              y1={y}
              x2={W - PAD.right}
              y2={y}
              stroke="#2a2d35"
              strokeWidth={0.5}
            />
            <text
              x={PAD.left - 6}
              y={y + 3}
              textAnchor="end"
              className="fill-gray-500"
              fontSize={9}
            >
              {(p * 100).toFixed(0)}¢
            </text>
          </g>
        ))}

        {/* X axis labels */}
        {xLabels.map(({ t, x }) => (
          <text
            key={t}
            x={x}
            y={H - 6}
            textAnchor="middle"
            className="fill-gray-500"
            fontSize={9}
          >
            {new Date(t * 1000).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </text>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill={fillColor} />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />

        {/* Latest price dot */}
        <circle
          cx={toX(history[history.length - 1].t)}
          cy={toY(latestPrice)}
          r={3}
          fill={strokeColor}
        />
      </svg>
    </div>
  );
}
