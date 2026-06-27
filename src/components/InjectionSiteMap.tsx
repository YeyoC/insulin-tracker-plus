import type { InsulinSite } from "@/lib/storage";
import { SITES } from "@/lib/stats";
import { t, useLang } from "@/lib/i18n";

export function InjectionSiteMap({
  usage,
  mostUsed,
}: {
  usage: Record<InsulinSite, number>;
  mostUsed: InsulinSite | null;
}) {
  useLang();
  const color = (site: InsulinSite) =>
    site === mostUsed
      ? "fill-danger/30 stroke-danger"
      : usage[site] > 0
        ? "fill-primary/20 stroke-primary"
        : "fill-muted stroke-border";

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="grid grid-cols-2 gap-2">
        <BodySilhouette label={t("history.front")} color={color} usage={usage} view="front" />
        <BodySilhouette label={t("history.back")} color={color} usage={usage} view="back" />
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        {SITES.map((s) => (
          <li key={s} className="flex justify-between">
            <span className={s === mostUsed ? "font-semibold text-danger" : ""}>{t(`site.${s}`)}</span>
            <span className="tabular-nums text-muted-foreground">{usage[s]}×</span>
          </li>
        ))}
      </ul>
      {mostUsed && (
        <p className="mt-3 rounded-md bg-danger/10 p-2 text-xs text-danger">
          {t("history.avoidSite", { site: t(`site.${mostUsed}`) })}
        </p>
      )}
    </div>
  );
}

function BodySilhouette({
  label,
  color,
  usage,
  view,
}: {
  label: string;
  color: (s: InsulinSite) => string;
  usage: Record<InsulinSite, number>;
  view: "front" | "back";
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <svg viewBox="0 0 100 200" className="h-44 w-full">
        <circle cx="50" cy="18" r="10" className="fill-muted stroke-border" strokeWidth="1" />
        <rect x="32" y="30" width="36" height="50" rx="6" className="fill-muted stroke-border" strokeWidth="1" />
        <rect x="16" y="32" width="14" height="44" rx="6" className={`${color(view === "front" ? "Left arm" : "Right arm")}`} strokeWidth="1.5" />
        <rect x="70" y="32" width="14" height="44" rx="6" className={`${color(view === "front" ? "Right arm" : "Left arm")}`} strokeWidth="1.5" />
        {view === "front" ? (
          <rect x="34" y="60" width="32" height="22" rx="4" className={color("Abdomen")} strokeWidth="1.5" />
        ) : (
          <rect x="34" y="60" width="32" height="22" rx="4" className={color("Buttock")} strokeWidth="1.5" />
        )}
        <rect x="32" y="90" width="16" height="60" rx="6" className={color(view === "front" ? "Left thigh" : "Right thigh")} strokeWidth="1.5" />
        <rect x="52" y="90" width="16" height="60" rx="6" className={color(view === "front" ? "Right thigh" : "Left thigh")} strokeWidth="1.5" />
        <rect x="32" y="152" width="16" height="40" rx="6" className="fill-muted stroke-border" strokeWidth="1" />
        <rect x="52" y="152" width="16" height="40" rx="6" className="fill-muted stroke-border" strokeWidth="1" />

        <text x="23" y="58" textAnchor="middle" fontSize="7" className="fill-foreground">
          {usage[view === "front" ? "Left arm" : "Right arm"]}
        </text>
        <text x="77" y="58" textAnchor="middle" fontSize="7" className="fill-foreground">
          {usage[view === "front" ? "Right arm" : "Left arm"]}
        </text>
        <text x="50" y="74" textAnchor="middle" fontSize="8" className="fill-foreground font-semibold">
          {view === "front" ? usage.Abdomen : usage.Buttock}
        </text>
        <text x="40" y="124" textAnchor="middle" fontSize="7" className="fill-foreground">
          {usage[view === "front" ? "Left thigh" : "Right thigh"]}
        </text>
        <text x="60" y="124" textAnchor="middle" fontSize="7" className="fill-foreground">
          {usage[view === "front" ? "Right thigh" : "Left thigh"]}
        </text>
      </svg>
    </div>
  );
}
