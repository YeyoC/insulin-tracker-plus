import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, AlertTriangle, Moon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  getGlucose,
  getInsulin,
  glucoseStatus,
  type GlucoseEntry,
  type InsulinEntry,
} from "@/lib/storage";
import { useProfile } from "@/hooks/useProfile";
import {
  type Period,
  periodLabel,
  filterByPeriod,
  glucoseStats,
  avgDailyInsulin,
  highFastingStreak,
  nocturnalHypoglycemia,
  siteUsage,
  mostUsedSite,
} from "@/lib/stats";
import { GlucoseTrendChart } from "@/components/GlucoseTrendChart";
import { InjectionSiteMap } from "@/components/InjectionSiteMap";
import { exportReport } from "@/lib/exportPdf";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "History — InsulinaApp" }] }),
  component: HistoryPage,
});

type Tab = "stats" | "glucose" | "insulin";

function HistoryPage() {
  const { profile } = useProfile();
  const [tab, setTab] = useState<Tab>("stats");
  const [period, setPeriod] = useState<Period>("week");
  const [glucose, setGlucose] = useState<GlucoseEntry[]>([]);
  const [insulin, setInsulin] = useState<InsulinEntry[]>([]);

  useEffect(() => {
    const refresh = () => {
      setGlucose(getGlucose());
      setInsulin(getInsulin());
    };
    refresh();
    window.addEventListener("insulina:update", refresh);
    return () => window.removeEventListener("insulina:update", refresh);
  }, []);

  const periodGlucose = useMemo(() => filterByPeriod(glucose, period), [glucose, period]);
  const periodInsulin = useMemo(() => filterByPeriod(insulin, period), [insulin, period]);

  const stats = useMemo(
    () => glucoseStats(periodGlucose, profile?.rangeMin ?? 70, profile?.rangeMax ?? 180),
    [periodGlucose, profile],
  );
  const ins = useMemo(() => avgDailyInsulin(periodInsulin, period), [periodInsulin, period]);
  const fastingStreak = useMemo(() => highFastingStreak(periodGlucose), [periodGlucose]);
  const nocturnal = useMemo(() => nocturnalHypoglycemia(periodGlucose), [periodGlucose]);
  const usage = useMemo(() => siteUsage(periodInsulin), [periodInsulin]);
  const topSite = useMemo(() => mostUsedSite(periodInsulin), [periodInsulin]);

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-primary">History</h1>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-muted p-1">
        {(["stats", "glucose", "insulin"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "stats" && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted p-1">
            {(Object.keys(periodLabel) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md py-2 text-xs font-medium transition-colors ${
                  period === p ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                }`}
              >
                {periodLabel[p]}
              </button>
            ))}
          </div>

          {fastingStreak.hasStreak && (
            <PatternNote
              icon={<AlertTriangle className="size-4" />}
              tone="warn"
              text={`Your fasting glucose has been high for ${fastingStreak.days.length} consecutive days. Consider mentioning it to your doctor.`}
            />
          )}
          {nocturnal.length >= 2 && (
            <PatternNote
              icon={<Moon className="size-4" />}
              tone="danger"
              text={`Nocturnal hypoglycemia detected ${nocturnal.length} times (10pm–7am). Please review with your doctor.`}
            />
          )}

          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Overall avg" value={stats.overallAvg} unit="mg/dL" />
            <StatCard label="Fasting avg" value={stats.fastingAvg} unit="mg/dL" />
            <StatCard label="Post-meal avg" value={stats.postMealAvg} unit="mg/dL" />
            <StatCard
              label="Time in range"
              value={stats.inRangePct}
              unit="%"
              tone="ok"
            />
            <StatCard
              label="Below 70"
              value={stats.belowPct}
              unit="%"
              sub={`${stats.below} times`}
              tone="danger"
            />
            <StatCard
              label="Above 180"
              value={stats.abovePct}
              unit="%"
              sub={`${stats.above} times`}
              tone="warn"
            />
            <StatCard label="Avg daily NPH" value={ins.nph} unit="U" decimals={1} />
            <StatCard label="Avg daily Lispro" value={ins.lispro} unit="U" decimals={1} />
          </div>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-primary">Glucose trend</h2>
            <GlucoseTrendChart
              entries={periodGlucose}
              rangeMin={profile?.rangeMin ?? 70}
              rangeMax={profile?.rangeMax ?? 180}
            />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-primary">Injection sites</h2>
            <InjectionSiteMap usage={usage} mostUsed={topSite} />
          </section>

          <button
            onClick={() =>
              exportReport({
                profile,
                period,
                glucose: periodGlucose,
                insulin: periodInsulin,
              })
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow"
          >
            <Download className="size-4" />
            Export PDF for my doctor
          </button>
        </div>
      )}

      {tab === "glucose" && (
        <ul className="mt-5 space-y-2">
          {glucose.length === 0 ? (
            <Empty label="No glucose entries yet." />
          ) : (
            glucose.map((g) => {
              const s = glucoseStatus(
                g.value,
                profile?.rangeMin ?? 70,
                profile?.rangeMax ?? 180,
              );
              const dot =
                s === "ok" ? "bg-success" : s === "warn" ? "bg-warning" : "bg-danger";
              return (
                <li
                  key={g.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <span className={`size-3 rounded-full ${dot}`} />
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-semibold">
                        {g.value}{" "}
                        <span className="text-sm font-normal text-muted-foreground">
                          mg/dL
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(g.timestamp).toLocaleString(undefined, {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{g.moment}</p>
                    {g.notes && <p className="mt-1 text-sm">{g.notes}</p>}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      )}

      {tab === "insulin" && (
        <ul className="mt-5 space-y-2">
          {insulin.length === 0 ? (
            <Empty label="No insulin entries yet." />
          ) : (
            insulin.map((i) => (
              <li key={i.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-semibold text-primary">
                    {i.type} · {i.units}U
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(i.timestamp).toLocaleString(undefined, {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{i.site}</p>
                {i.notes && <p className="mt-1 text-sm">{i.notes}</p>}
              </li>
            ))
          )}
        </ul>
      )}
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  unit,
  sub,
  decimals = 0,
  tone,
}: {
  label: string;
  value: number;
  unit: string;
  sub?: string;
  decimals?: number;
  tone?: "ok" | "warn" | "danger";
}) {
  const toneClass =
    tone === "ok"
      ? "text-success"
      : tone === "warn"
        ? "text-warning"
        : tone === "danger"
          ? "text-danger"
          : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${toneClass}`}>
        {value.toFixed(decimals)}
        <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function PatternNote({
  icon,
  text,
  tone,
}: {
  icon: React.ReactNode;
  text: string;
  tone: "warn" | "danger";
}) {
  const cls =
    tone === "danger"
      ? "bg-danger/10 text-danger border-danger/30"
      : "bg-warning/10 text-warning-foreground border-warning/30";
  return (
    <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${cls}`}>
      <span className="mt-0.5">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <li className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
      {label}
    </li>
  );
}
