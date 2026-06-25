import { useEffect, useState } from "react";
import { getInsulin } from "@/lib/storage";
import { activeWindows, activityAt, formatTime, type InsulinWindow } from "@/lib/insulin";

export function ActiveInsulinBar() {
  const [now, setNow] = useState<Date | null>(null);
  const [windows, setWindows] = useState<InsulinWindow[]>([]);

  useEffect(() => {
    const refresh = () => {
      const n = new Date();
      setNow(n);
      setWindows(activeWindows(getInsulin(), n));
    };
    refresh();
    const t = setInterval(refresh, 30_000);
    window.addEventListener("insulina:update", refresh);
    return () => {
      clearInterval(t);
      window.removeEventListener("insulina:update", refresh);
    };
  }, []);

  if (!now || windows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-4 text-center text-sm text-muted-foreground">
        No active insulin right now.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {windows.map((w) => {
        const pct = Math.round(activityAt(w, now) * 100);
        return (
          <div key={w.entry.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold" style={{ color: w.profile.color }}>
                {w.profile.label} · {w.entry.units}U
              </span>
              <span className="text-xs text-muted-foreground">
                peak {formatTime(w.peakStart)}–{formatTime(w.peakEnd)} · ends {formatTime(w.end)}
              </span>
            </div>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: w.profile.color }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{pct}% active</p>
          </div>
        );
      })}
    </div>
  );
}
