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
  moment === "Fasting"
    ? "var(--chart-fasting)"
    : moment === "Post-meal"
      ? "var(--chart-post-meal)"
      : "var(--chart-other)";

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
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={fmtDate}
              tick={{ fontSize: 11 }}
              stroke="var(--chart-axis)"
            />
            <YAxis
              domain={[40, "dataMax + 20"]}
              tick={{ fontSize: 11 }}
              stroke="var(--chart-axis)"
            />
            <Tooltip
              labelFormatter={(tt) => new Date(Number(tt)).toLocaleString(locale(lang))}
              formatter={(v: number, _n, p) => [`${v} mg/dL`, t(`moment.${p.payload.moment}`)]}
              contentStyle={{
                fontSize: 12,
                background: "var(--popover)",
                color: "var(--popover-foreground)",
                borderColor: "var(--border)",
              }}
            />
            <ReferenceLine y={rangeMin} stroke="var(--chart-range)" strokeDasharray="4 4" />
            <ReferenceLine y={rangeMax} stroke="var(--chart-range)" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--chart-line)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Scatter dataKey="value" shape="circle" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <LegendDot color="var(--chart-fasting)" label={t("history.legend.fasting")} />
        <LegendDot color="var(--chart-post-meal)" label={t("history.legend.postMeal")} />
        <LegendDot color="var(--chart-other)" label={t("history.legend.other")} />
        <LegendDot color="var(--chart-range)" label={t("history.legend.range", { min: rangeMin, max: rangeMax })} dashed />
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
