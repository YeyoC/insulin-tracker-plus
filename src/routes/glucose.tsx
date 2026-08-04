import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { addGlucose, getGlucose, updateGlucose, type GlucoseEntry } from "@/lib/storage";
import { t, useLang } from "@/lib/i18n";
import { nowLocalInput, toLocalInput } from "@/lib/utils";

export const Route = createFileRoute("/glucose")({
  validateSearch: (search: Record<string, unknown>): { edit?: string } =>
    search.edit ? { edit: String(search.edit) } : {},
  head: () => ({ meta: [{ title: "Log glucose — InsulinaApp" }] }),
  component: GlucosePage,
});

const moments: GlucoseEntry["moment"][] = [
  "Fasting",
  "Pre-meal",
  "Post-meal",
  "Bedtime",
  "Overnight",
];

function GlucosePage() {
  useLang();
  const navigate = useNavigate();
  const { edit } = Route.useSearch();
  const existing = useMemo(
    () => (edit ? getGlucose().find((g) => g.id === edit) ?? null : null),
    [edit],
  );
  const [value, setValue] = useState<number | "">(existing?.value ?? "");
  const [moment, setMoment] = useState<GlucoseEntry["moment"]>(existing?.moment ?? "Fasting");
  const [time, setTime] = useState(
    existing ? toLocalInput(existing.timestamp) : nowLocalInput(),
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof value !== "number" || value <= 0) return;
    const payload = {
      value,
      moment,
      notes: notes.trim() || undefined,
      timestamp: new Date(time).toISOString(),
    };
    if (existing) updateGlucose(existing.id, payload);
    else addGlucose(payload);
    window.dispatchEvent(
      new CustomEvent("insulina:saved", {
        detail: {
          type: "glucose",
          message: existing ? t("common.updated") : "Guardado",
        },
      }),
    );
    navigate({ to: existing ? "/history" : "/" });
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-primary">{t("glucose.title")}</h1>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{t("glucose.value")}</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={value}
            onChange={(e) =>
              setValue(e.target.value === "" ? "" : Number(e.target.value))
            }
            required
            className="input text-2xl font-semibold"
            placeholder={t("glucose.valuePh")}
          />
        </label>

        <div>
          <span className="mb-2 block text-sm font-medium">{t("glucose.moment")}</span>
          <div className="grid grid-cols-2 gap-2">
            {moments.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMoment(m)}
                className={`rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
                  moment === m
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                {t(`moment.${m}`)}
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
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="input"
          />
        </label>

        <button type="submit" className="btn-primary w-full">
          {existing ? t("common.update") : t("common.save")}
        </button>
        {existing && (
          <button
            type="button"
            onClick={() => navigate({ to: "/history" })}
            className="w-full rounded-xl border border-border bg-card py-3 text-sm font-medium"
          >
            {t("common.cancel")}
          </button>
        )}
      </form>
    </AppShell>
  );
}
