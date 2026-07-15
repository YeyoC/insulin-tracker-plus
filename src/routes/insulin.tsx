import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { addInsulin, getMeals, totalCarbs, type InsulinSite } from "@/lib/storage";
import { useProfile } from "@/hooks/useProfile";
import { calculateDose, getLisproRatio, DIFF_REASONS } from "@/lib/dose";
import { t, useLang } from "@/lib/i18n";
import { INSULIN_CATALOG, PROFILES, USUAL_TYPES } from "@/lib/insulin";

export const Route = createFileRoute("/insulin")({
  validateSearch: (search: Record<string, unknown>) => ({
    type: (search.type as string) || undefined,
    units: search.units ? Number(search.units) : undefined,
    mealCarbs: search.mealCarbs ? Number(search.mealCarbs) : undefined,
    fromMeal: Boolean(search.fromMeal),
  }),
  head: () => ({ meta: [{ title: "Insulina — InsulinaApp" }] }),
  component: InsulinPage,
});

const INSULIN_GROUPS = INSULIN_CATALOG.map((cat) => ({ group: cat.category, types: [...cat.types] }));
const USUAL = USUAL_TYPES;
const SITES: InsulinSite[] = [
  "Abdomen", "Left thigh", "Right thigh", "Left arm", "Right arm", "Buttock",
];

function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function InsulinPage() {
  useLang();
  const navigate  = useNavigate();
  const router    = useRouter();
  const { profile } = useProfile();
  const { type: preType, units: preUnits, mealCarbs: preMealCarbs, fromMeal } =
    Route.useSearch();

  const [selectedType, setSelectedType] = useState<string>(preType ?? "Lispro");
  const [nphUnits,     setNphUnits]     = useState<number | ("")>("");
  const [lisproUnits,  setLisproUnits]  = useState<number | ("")>(
    preType === "Lispro" && preUnits ? preUnits : ""
  );
  const [otherUnits,   setOtherUnits]   = useState<number | ("")>(
    preType && !USUAL.includes(preType) && preUnits ? preUnits : ""
  );
  const [site,         setSite]         = useState<InsulinSite>("Abdomen");
  const [time,         setTime]         = useState(nowLocal());
  const [notes,        setNotes]        = useState("");
  const [mealCarbs,    setMealCarbs]    = useState<number | ("")>(preMealCarbs ?? "");
  const [glucose,      setGlucose]      = useState<number | ("")>("");
  const [mealNote,     setMealNote]     = useState<string | null>(null);
  const [reason,       setReason]       = useState("");
  const [reasonOther,  setReasonOther]  = useState("");

  useEffect(() => {
    if (preMealCarbs) return;
    const last = getMeals()[0];
    if (!last) return;
    const ageMin = (Date.now() - new Date(last.timestamp).getTime()) / 60000;
    if (ageMin < 30) {
      setMealCarbs(Math.round(totalCarbs(last.foods)));
      setMealNote(`Carbos de tu última comida (hace ${Math.round(ageMin)} min)`);
    }
  }, []);

  const breakdown = useMemo(() => {
    if (!profile) return null;
    const carbs = typeof mealCarbs === "number" ? mealCarbs : 0;
    if (carbs <= 0 && typeof glucose !== "number") return null;
    return calculateDose({
      profile,
      mealCarbs: carbs,
      currentGlucose: typeof glucose === "number" ? glucose : undefined,
      mealTime: new Date(time),
    });
  }, [profile, mealCarbs, glucose, time]);

  const recommended = breakdown?.totalDose;
  const actual      = typeof lisproUnits === "number" ? lisproUnits : null;
  const differs     = recommended !== undefined && actual !== null
    && Math.abs(actual - recommended) >= 0.5;
  const showOther   = selectedType && !USUAL.includes(selectedType);

  const currentRatio = profile ? getLisproRatio(profile, new Date(time)) : null;
  const timeSlot = new Date(time).getHours() < 12 ? "mañana"
    : new Date(time).getHours() < 18 ? "tarde" : "noche";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (differs && !reason) return;
    const finalReason = reason === "Other (specify)"
      ? (reasonOther.trim() || "Other")
      : (reason || undefined);
    const ts = new Date(time).toISOString();

    if (typeof nphUnits === "number" && nphUnits > 0)
      addInsulin({ type: profile?.basalInsulinType || "NPH", units: nphUnits, site,
        notes: notes.trim() || undefined, timestamp: ts });

    if (typeof lisproUnits === "number" && lisproUnits > 0)
      addInsulin({ type: profile?.rapidInsulinType || "Lispro", units: lisproUnits, site,
        notes: notes.trim() || undefined, timestamp: ts,
        recommended, diffReason: differs ? finalReason : undefined });

    if (showOther && typeof otherUnits === "number" && otherUnits > 0)
      addInsulin({ type: selectedType, units: otherUnits, site,
        notes: notes.trim() || undefined, timestamp: ts });

    window.dispatchEvent(new CustomEvent("insulina:saved", { detail: { type: "insulin" } }));
    navigate({ to: "/" });
  };

  return (
    <AppShell>
      <button
        onClick={() => router.history.back()}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="size-4" /> Atrás
      </button>

      <h1 className="text-2xl font-bold text-primary">Registrar insulina</h1>

      {fromMeal && (
        <div className="mt-3 rounded-lg bg-accent p-3 text-sm text-accent-foreground">
          Pre-llenado desde tu última comida. Revisa la dosis antes de guardar.
        </div>
      )}

      <form onSubmit={submit} className="mt-5 space-y-6">

        <div>
          <span className="mb-2 block text-sm font-medium">Tipo de insulina</span>
          <div className="space-y-3">
            {INSULIN_GROUPS.map(({ group, types }) => (
              <div key={group}>
                <p className="mb-1.5 text-xs text-muted-foreground">{group}</p>
                <div className="flex flex-wrap gap-2">
                  {types.map((tp) => (
                    <button key={tp} type="button"
                      onClick={() => setSelectedType(tp)}
                      title={PROFILES[tp]?.brandNames?.join(" · ")}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors
                        ${selectedType === tp
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:bg-accent"}`}>
                      {USUAL.includes(tp) ? `★ ${tp}` : tp}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Carbos (g)</span>
            <input type="number" inputMode="decimal" min={0} value={mealCarbs}
              onChange={(e) => setMealCarbs(e.target.value === "" ? "" : Number(e.target.value))}
              className="input" placeholder="0" />
            {mealNote && (
              <span className="mt-1 block text-xs text-muted-foreground">{mealNote}</span>
            )}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Glucosa (mg/dL)</span>
            <input type="number" inputMode="numeric" min={0} value={glucose}
              onChange={(e) => setGlucose(e.target.value === "" ? "" : Number(e.target.value))}
              className="input" placeholder="mg/dL" />
          </label>
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium">Dosis aplicada</span>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Insulina</th>
                  <th className="px-3 py-2 text-center font-medium">Cantidad</th>
                  <th className="px-3 py-2 text-center font-medium">Recomendado</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-3 py-3">
                    <span className="font-medium">
                      ★ {profile?.basalInsulinType || "NPH"}
                    </span>
                    {profile?.prescribedBasalMorning && (
                      <p className="text-xs text-muted-foreground">
                        Recetado: {profile.prescribedBasalMorning}U mañana
                        {profile.prescribedBasalNight
                          ? ` / ${profile.prescribedBasalNight}U noche`
                          : ""}
                      </p>
                    )}
                    {profile?.prescribedBasalDaily && (
                      <p className="text-xs text-muted-foreground">
                        Recetado: {profile.prescribedBasalDaily}U/día
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <input type="number" inputMode="decimal" step={0.5} min={0}
                      value={nphUnits}
                      onChange={(e) => setNphUnits(e.target.value === "" ? "" : Number(e.target.value))}
                      className="mx-auto block w-20 rounded-lg border border-border bg-card px-2 py-2 text-center text-base font-semibold"
                      placeholder="0" />
                  </td>
                  <td className="px-3 py-3 text-center text-muted-foreground text-sm">—</td>
                </tr>

                <tr className="border-t border-border bg-accent/20">
                  <td className="px-3 py-3">
                    <span className="font-medium">
                      ★ {profile?.rapidInsulinType || "Lispro"}
                    </span>
                    {currentRatio && (
                      <p className="text-xs text-muted-foreground">
                        1U / {currentRatio}g CHO ({timeSlot})
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <input type="number" inputMode="decimal" step={0.5} min={0}
                      value={lisproUnits}
                      onChange={(e) => setLisproUnits(e.target.value === "" ? "" : Number(e.target.value))}
                      className="mx-auto block w-20 rounded-lg border border-border bg-card px-2 py-2 text-center text-base font-semibold"
                      placeholder="0" />
                  </td>
                  <td className="px-3 py-3 text-center font-bold text-primary">
                    {recommended !== undefined ? `${recommended}U` : "—"}
                  </td>
                </tr>

                {showOther && (
                  <tr className="border-t border-border">
                    <td className="px-3 py-3 font-medium">{selectedType}</td>
                    <td className="px-3 py-3">
                      <input type="number" inputMode="decimal" step={0.5} min={0}
                        value={otherUnits}
                        onChange={(e) => setOtherUnits(e.target.value === "" ? "" : Number(e.target.value))}
                        className="mx-auto block w-20 rounded-lg border border-border bg-card px-2 py-2 text-center text-base font-semibold"
                        placeholder="0" />
                    </td>
                    <td className="px-3 py-3 text-center text-muted-foreground text-sm">—</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {breakdown && (
          <div className="rounded-lg bg-accent p-4 space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Desglose {profile?.rapidInsulinType || "Lispro"}
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>Por carbos: {breakdown.carbDose.toFixed(1)}U</li>
              {breakdown.correctionDose > 0 && (
                <li>Corrección glucosa: +{breakdown.correctionDose.toFixed(1)}U</li>
              )}
            </ul>
            {breakdown.adjustments.length > 0 && (
              <ul className="space-y-1 text-xs font-medium text-secondary">
                {breakdown.adjustments.map((a, i) => (
                  <li key={i}>• {t(a.reasonKey, a.reasonParams)}</li>
                ))}
              </ul>
            )}
            <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
              <span>Total recomendado</span>
              <span className="text-primary">{breakdown.totalDose}U</span>
            </div>
            <p className="text-xs italic text-muted-foreground">
              Solo es una sugerencia. Confirma con tu médico.
            </p>
          </div>
        )}

        {differs && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 space-y-3">
            <p className="text-sm font-medium">
              La dosis difiere de la recomendada. ¿Por qué?
            </p>
            <select required value={reason}
              onChange={(e) => setReason(e.target.value)} className="input">
              <option value="">Selecciona un motivo</option>
              {DIFF_REASONS.map((r) => (
                <option key={r} value={r}>{t(`reason.${r}`)}</option>
              ))}
            </select>
            {reason === "Other (specify)" && (
              <input value={reasonOther}
                onChange={(e) => setReasonOther(e.target.value)}
                placeholder="Especifica el motivo" className="input" />
            )}
          </div>
        )}

        <div>
          <span className="mb-2 block text-sm font-medium">Zona de inyección</span>
          <div className="grid grid-cols-2 gap-2">
            {SITES.map((s) => (
              <button key={s} type="button" onClick={() => setSite(s)}
                className={`rounded-lg border px-3 py-3 text-sm font-medium transition-colors
                  ${site === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-accent"}`}>
                {t(`site.${s}`)}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Hora de inyección</span>
          <input type="datetime-local" value={time}
            onChange={(e) => setTime(e.target.value)} className="input" />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Notas (opcional)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            rows={2} className="input" />
        </label>

        <button type="submit" className="btn-primary w-full">
          Guardar insulina
        </button>
      </form>
    </AppShell>
  );
}
