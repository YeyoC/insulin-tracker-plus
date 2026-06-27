import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  addExercise,
  deleteExercise,
  getExercise,
  getInsulin,
  type ExerciseContext,
  type ExerciseEntry,
  type ExerciseIntensity,
  type ExerciseType,
} from "@/lib/storage";
import { activeWindows } from "@/lib/insulin";
import { t, locale, useLang } from "@/lib/i18n";

const TYPES: ExerciseType[] = [
  "Weightlifting",
  "Cardio",
  "Crossfit",
  "Walking",
  "Swimming",
  "Cycling",
  "Other",
];
const INTENSITIES: ExerciseIntensity[] = ["Light", "Moderate", "Intense"];
const CONTEXTS: ExerciseContext[] = ["Fasted", "After a meal", "With active insulin"];

export const Route = createFileRoute("/exercise")({
  head: () => ({ meta: [{ title: "Exercise — InsulinaApp" }] }),
  component: ExercisePage,
});

function localDateTimeValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ExercisePage() {
  const lang = useLang();
  const navigate = useNavigate();
  const [type, setType] = useState<ExerciseType>("Walking");
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState<ExerciseIntensity>("Moderate");
  const [context, setContext] = useState<ExerciseContext>("Fasted");
  const [notes, setNotes] = useState("");
  const [when, setWhen] = useState(() => localDateTimeValue(new Date()));
  const [list, setList] = useState<ExerciseEntry[]>(() => getExercise());

  const nphActive = useMemo(() => {
    return activeWindows(getInsulin(), new Date()).some(
      (w) => w.entry.type === "NPH",
    );
  }, [list]);

  const intenseWithNph = intensity === "Intense" && nphActive;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (intenseWithNph) {
      const ok = window.confirm(t("exercise.confirm"));
      if (!ok) return;
    }
    addExercise({
      type,
      durationMin: duration,
      intensity,
      context,
      notes: notes.trim() || undefined,
      timestamp: new Date(when).toISOString(),
    });
    setList(getExercise());
    setNotes("");
  };

  return (
    <AppShell>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-primary">{t("exercise.title")}</h1>
        <button onClick={() => navigate({ to: "/" })} className="text-sm text-secondary">
          {t("common.skip")}
        </button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("exercise.optional")}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label={t("exercise.type")}>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as ExerciseType)}>
            {TYPES.map((tp) => <option key={tp} value={tp}>{t(`exerciseType.${tp}`)}</option>)}
          </select>
        </Field>
        <Field label={t("exercise.duration")}>
          <input type="number" min={1} className="input" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
        </Field>
        <Field label={t("exercise.intensity")}>
          <select className="input" value={intensity} onChange={(e) => setIntensity(e.target.value as ExerciseIntensity)}>
            {INTENSITIES.map((tp) => <option key={tp} value={tp}>{t(`intensity.${tp}`)}</option>)}
          </select>
        </Field>
        <Field label={t("exercise.context")}>
          <select className="input" value={context} onChange={(e) => setContext(e.target.value as ExerciseContext)}>
            {CONTEXTS.map((tp) => <option key={tp} value={tp}>{t(`ctx.${tp}`)}</option>)}
          </select>
        </Field>
        <Field label={t("common.time")}>
          <input type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} />
        </Field>
        <Field label={t("common.notes")}>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {intenseWithNph && (
          <div className="rounded-xl border-l-4 border-l-red-600 bg-red-50 p-3 text-sm text-red-900">
            {t("exercise.warn")}
          </div>
        )}

        <button type="submit" className="btn-primary w-full">{t("common.save")}</button>
      </form>

      <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("exercise.recent")}
      </h2>
      <ul className="space-y-2">
        {list.length === 0 && (
          <li className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            {t("exercise.empty")}
          </li>
        )}
        {list.slice(0, 10).map((e) => (
          <li key={e.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <div className="min-w-0">
              <p className="font-semibold">{t(`exerciseType.${e.type}`)} · {e.durationMin}min</p>
              <p className="text-xs text-muted-foreground">
                {t(`intensity.${e.intensity}`)} · {t(`ctx.${e.context}`)} ·{" "}
                {new Date(e.timestamp).toLocaleString(locale(lang), { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
              </p>
            </div>
            <button
              onClick={() => { deleteExercise(e.id); setList(getExercise()); }}
              className="text-xs text-danger hover:underline"
            >
              {t("common.delete")}
            </button>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
