import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  alertsForDay,
  respondToAlert,
  type AlertRecord,
  type AlertResponse,
} from "@/lib/alerts";

export const Route = createFileRoute("/alerts")({
  head: () => ({ meta: [{ title: "Alerts — InsulinaApp" }] }),
  component: AlertsPage,
});

const LEVEL_STYLES: Record<AlertRecord["level"], string> = {
  red: "border-l-4 border-l-red-600 bg-red-50",
  orange: "border-l-4 border-l-orange-500 bg-orange-50",
  yellow: "border-l-4 border-l-yellow-500 bg-yellow-50",
  blue: "border-l-4 border-l-sky-600 bg-sky-50",
};

const RESPONSE_LABEL: Record<AlertResponse, string> = {
  ignored: "I ignored it",
  ate: "I ate something",
  checked: "I checked my glucose",
};

function AlertsPage() {
  const [list, setList] = useState<AlertRecord[]>([]);

  useEffect(() => {
    const refresh = () => setList(alertsForDay(new Date()));
    refresh();
    window.addEventListener("insulina:update", refresh);
    return () => window.removeEventListener("insulina:update", refresh);
  }, []);

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-primary">Alerts today</h1>
      <ul className="mt-5 space-y-3">
        {list.length === 0 && (
          <li className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            No alerts today.
          </li>
        )}
        {list.map((a) => (
          <li key={a.id} className={`rounded-xl p-4 ${LEVEL_STYLES[a.level]}`}>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide">
                {a.level}
                {a.resent && <span className="ml-2 text-muted-foreground">· resent</span>}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(a.firedAt).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="mt-1 text-sm text-foreground">{a.message}</p>
            {a.response ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Response: {RESPONSE_LABEL[a.response]}
                {a.respondedAt
                  ? ` · ${new Date(a.respondedAt).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : ""}
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.keys(RESPONSE_LABEL) as AlertResponse[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => respondToAlert(a.id, r)}
                    className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    {RESPONSE_LABEL[r]}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
