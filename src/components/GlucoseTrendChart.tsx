import {
  ResponsiveContainer,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Scatter,
  ComposedChart,
} from "recharts";
import type { GlucoseEntry } from "@/lib/storage";
import { t, locale, useLang } from "@/lib/i18n";

const colorFor = (moment: GlucoseEntry["moment"]) =>
  moment === "Fasting" ? "#1A6B9A" : moment === "Post-meal" ? "#E89B3C" : "#8A8A8A";

export function GlucoseTrendChart({
  entries,
  rangeMin = 70,
  rangeMax = 180,
}: {
  entries: GlucoseEntry[];
  rangeMin?: number;
  rangeMax?: number;
}) {
  const lang = useLang();
  const data = [...entries]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((e) => ({
      t: new Date(e.timestamp).getTime(),
      value: e.value,
      moment: e.moment,
      fill: colorFor(e.moment),
    }));

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
        {t("history.noGlucoseChart")}
      </div>
    );
  }

  const fmtDate = (tt: number) =>
    new Date(tt).toLocaleDateString(locale(lang), { month: "short", day: "numeric" });

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={fmtDate}
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              domain={[40, "dataMax + 20"]}
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip
              labelFormatter={(tt) => new Date(Number(tt)).toLocaleString(locale(lang))}
              formatter={(v: number, _n, p) => [`${v} mg/dL`, t(`moment.${p.payload.moment}`)]}
              contentStyle={{ fontSize: 12 }}
            />
            <ReferenceLine y={rangeMin} stroke="#2BAE66" strokeDasharray="4 4" />
            <ReferenceLine y={rangeMax} stroke="#2BAE66" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#1A3A5C"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Scatter dataKey="value" shape="circle" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <LegendDot color="#1A6B9A" label={t("history.legend.fasting")} />
        <LegendDot color="#E89B3C" label={t("history.legend.postMeal")} />
        <LegendDot color="#8A8A8A" label={t("history.legend.other")} />
        <LegendDot color="#2BAE66" label={t("history.legend.range", { min: rangeMin, max: rangeMax })} dashed />
      </div>
    </div>
  );
}

function LegendDot({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block size-3 rounded-full"
        style={{
          background: dashed ? "transparent" : color,
          border: dashed ? `2px dashed ${color}` : undefined,
        }}
      />
      {label}
    </span>
  );
}
