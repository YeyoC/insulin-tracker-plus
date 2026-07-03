import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { addInsulin, type InsulinEntry, type InsulinSite } from "@/lib/storage";
import { useProfile } from "@/hooks/useProfile";
import { calculateDose, DIFF_REASONS } from "@/lib/dose";
import { t, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/insulin")({
  head: () => ({ meta: [{ title: "Log insulin — InsulinaApp" }] }),
  component: InsulinPage,
});

const sites: InsulinSite[] = [
  "Abdomen", "Left thigh", "Right thigh", "Left arm", "Right arm", "Buttock",
];

function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function InsulinPage() {
  useLang();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [type, setType] = useState<InsulinEntry["type"]>("Lispro");
  const [units, setUnits] = useState<number | "">("");
  const [site, setSite] = useState<InsulinSite>("Abdomen");
  const [time, setTime] = useState<string>(nowLocalInput());
  const [notes, setNotes] = useState("");

  const [mealCarbs, setMealCarbs] = useState<number | "">("");
  const [currentGlucose, setCurrentGlucose] = useState<number | "">("");
  const [reason, setReason] = useState<string>("");
  const [reasonOther, setReasonOther] = useState("");

  const breakdown = useMemo(() => {
    if (!profile || type !== "Lispro") return null;
    const carbs = typeof mealCarbs === "number" ? mealCarbs : 0;
    if (carbs <= 0 && typeof currentGlucose !== "number") return null;
    return calculateDose({
      profile,
      mealCarbs: carbs,
      currentGlucose: typeof currentGlucose === "number" ? currentGlucose : undefined,
      mealTime: new Date(time),
    });
  }, [profile, type, mealCarbs, currentGlucose, time]);

  const recommended = breakdown?.totalDose;
  const actual = typeof units === "number" ? units : null;
  const differs =
    recommended !== undefined && actual !== null && Math.abs(actual - recommended) >= 0.5;
  const needsReason = differs;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (actual === null || actual <= 0) return;
    if (needsReason && !reason) return;
    const finalReason =
      reason === "Other (specify)" ? reasonOther.trim() || "Other" : reason || undefined;
    addInsulin({
      type,
      units: actual,
      site,
      notes: notes.trim() || undefined,
      timestamp: new Date(time).toISOString(),
      recommended,
      diffReason: needsReason ? finalReason : undefined,
    });
    window.dispatchEvent(new CustomEvent("insulina:saved", { detail: { type: "insulin" } }));
    navigate({ to: "/history" });
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-primary">{t("insulin.title")}</h1>

      <form onSubmit={submit} className="mt-6 space-y-5">
        <div>
          <span className="mb-2 block text-sm font-medium">{t("insulin.type")}</span>
          <div className="grid grid-cols-2 gap-2">
            {(["NPH", "Lispro"] as const).map((tp) => (
              <button
                key={tp}
                type="button"
                onClick={() => setType(tp)}
                className={`rounded-lg border px-3 py-4 text-base font-semibold transition-colors ${
                  type === tp
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                {tp}
              </button>
            ))}
          </div>
        </div>

        {type === "Lispro" && (
          <section className="rounded-xl border border-border bg-card p-4 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("insulin.calculator")}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">{t("insulin.mealCarbs")}</span>
                <input
                  type="number" inputMode="decimal" min={0}
                  value={mealCarbs}
                  onChange={(e) => setMealCarbs(e.target.value === "" ? "" : Number(e.target.value))}
                  className="input"
                  placeholder="0"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">{t("insulin.currentGlucose")}</span>
                <input
                  type="number" inputMode="numeric" min={0}
                  value={currentGlucose}
                  onChange={(e) =>
                    setCurrentGlucose(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="input"
                  placeholder="mg/dL"
                />
              </label>
            </div>

            {breakdown && (
              <div className="rounded-lg bg-accent p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("insulin.recommendedDose")}
                </p>
                <p className="mt-1 text-4xl font-bold text-primary">
                  {breakdown.totalDose}
                  <span className="ml-1 text-base font-normal text-muted-foreground">U</span>
                </p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li>{t("insulin.carbDose")}: {breakdown.carbDose.toFixed(1)}U</li>
                  <li>{t("insulin.correction")}: {breakdown.correctionDose.toFixed(1)}U</li>
                  <li>{t("insulin.base")}: {breakdown.baseDose.toFixed(1)}U</li>
                </ul>
                {breakdown.adjustments.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs font-medium text-secondary">
                    {breakdown.adjustments.map((a, i) => (
                      <li key={i}>• {t(a.reasonKey, a.reasonParams)}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground italic">
              {t("insulin.legal")}
            </p>
          </section>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">
            {t("insulin.actualUnits")}
          </span>
          <input
            type="number" inputMode="decimal" step={0.5} min={0.5}
            value={units}
            onChange={(e) => setUnits(e.target.value === "" ? "" : Number(e.target.value))}
            required
            className="input text-2xl font-semibold"
            placeholder={t("insulin.actualPh")}
          />
          {recommended !== undefined && (
            <span className="mt-1 block text-xs text-muted-foreground">
              {t("insulin.recommended", { n: recommended })}
            </span>
          )}
        </label>

        {needsReason && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 space-y-3">
            <p className="text-sm font-medium">
              {t("insulin.differs")}
            </p>
            <select
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input"
            >
              <option value="">{t("insulin.selectReason")}</option>
              {DIFF_REASONS.map((r) => (
                <option key={r} value={r}>{t(`reason.${r}`)}</option>
              ))}
            </select>
            {reason === "Other (specify)" && (
              <input
                value={reasonOther}
                onChange={(e) => setReasonOther(e.target.value)}
                placeholder={t("insulin.specifyReason")}
                className="input"
              />
            )}
          </div>
        )}

        <div>
          <span className="mb-2 block text-sm font-medium">{t("insulin.site")}</span>
          <div className="grid grid-cols-2 gap-2">
            {sites.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSite(s)}
                className={`rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
                  site === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                {t(`site.${s}`)}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{t("common.time")}</span>
          <input
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="input"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{t("common.notes")}</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input" />
        </label>

        <button type="submit" className="btn-primary w-full">{t("common.save")}</button>
      </form>
    </AppShell>
  );
}
