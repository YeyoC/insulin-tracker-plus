import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  getGlucose,
  getInsulin,
  glucoseStatus,
  type GlucoseEntry,
  type InsulinEntry,
} from "@/lib/storage";
import { useProfile } from "@/hooks/useProfile";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "History — InsulinaApp" }] }),
  component: HistoryPage,
});

type Tab = "glucose" | "insulin";

function HistoryPage() {
  const { profile } = useProfile();
  const [tab, setTab] = useState<Tab>("glucose");
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

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-primary">History</h1>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
        {(["glucose", "insulin"] as Tab[]).map((t) => (
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

      <ul className="mt-5 space-y-2">
        {tab === "glucose" &&
          (glucose.length === 0 ? (
            <Empty label="No glucose entries yet." />
          ) : (
            glucose.map((g) => {
              const s = glucoseStatus(
                g.value,
                profile?.rangeMin ?? 70,
                profile?.rangeMax ?? 180,
              );
              const dot =
                s === "ok"
                  ? "bg-success"
                  : s === "warn"
                    ? "bg-warning"
                    : "bg-danger";
              return (
                <li
                  key={g.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <span className={`size-3 rounded-full ${dot}`} />
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-semibold">
                        {g.value} <span className="text-sm font-normal text-muted-foreground">mg/dL</span>
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
          ))}

        {tab === "insulin" &&
          (insulin.length === 0 ? (
            <Empty label="No insulin entries yet." />
          ) : (
            insulin.map((i) => (
              <li
                key={i.id}
                className="rounded-xl border border-border bg-card p-4"
              >
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
          ))}
      </ul>
    </AppShell>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <li className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
      {label}
    </li>
  );
}
