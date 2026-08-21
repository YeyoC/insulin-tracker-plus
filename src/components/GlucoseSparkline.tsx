import type { GlucoseEntry } from "@/lib/storage";

/**
 * Minimal sparkline (no axes, no labels) for the last 24h of glucose readings.
 * Uses the same chronological sorting logic as GlucoseTrendChart.
 */
export function GlucoseSparkline({
  entries,
  color = "currentColor",
  width = 160,
  height = 40,
  className,
}: {
  entries: GlucoseEntry[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const points = [...entries]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((e) => ({ t: new Date(e.timestamp).getTime(), v: e.value }));

  if (points.length < 2) return null;

  const minT = points[0].t;
  const maxT = points[points.length - 1].t;
  const spanT = maxT - minT || 1;
  const values = points.map((p) => p.v);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const spanV = maxV - minV || 1;
  const pad = 3;

  const coords = points.map((p) => {
    const x = pad + ((p.t - minT) / spanT) * (width - pad * 2);
    const y = height - pad - ((p.v - minV) / spanV) * (height - pad * 2);
    return [x, y] as const;
  });

  const d = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = coords[coords.length - 1];

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} />
    </svg>
  );
}
