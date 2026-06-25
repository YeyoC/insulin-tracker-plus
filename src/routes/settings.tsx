import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getProfile, setProfile, type Profile } from "@/lib/storage";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — InsulinaApp" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [p, setP] = useState<Profile | null>(null);

  useEffect(() => setP(getProfile()), []);
  if (!p) return null;

  const update = <K extends keyof Profile>(k: K, v: Profile[K]) => setP({ ...p, [k]: v });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(p);
    navigate({ to: "/" });
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-primary">Settings</h1>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <Field label="Patient name">
          <input value={p.name} onChange={(e) => update("name", e.target.value)} className="input" />
        </Field>
        <Field label="Wake-up time">
          <input type="time" value={p.wakeTime} onChange={(e) => update("wakeTime", e.target.value)} className="input" />
        </Field>
        <Field label="Glucose target (mg/dL)">
          <input type="number" value={p.target} onChange={(e) => update("target", Number(e.target.value))} className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Range min"><input type="number" value={p.rangeMin} onChange={(e) => update("rangeMin", Number(e.target.value))} className="input" /></Field>
          <Field label="Range max"><input type="number" value={p.rangeMax} onChange={(e) => update("rangeMax", Number(e.target.value))} className="input" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="ICR (g carbs per 1U)">
            <input type="number" min={1} value={p.icr} onChange={(e) => update("icr", Number(e.target.value))} className="input" />
          </Field>
          <Field label="ISF (mg/dL per 1U)">
            <input type="number" min={1} value={p.isf} onChange={(e) => update("isf", Number(e.target.value))} className="input" />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          ICR = insulin-to-carb ratio. ISF = correction factor. Both apply to Lispro dose calculations.
        </p>
        <button type="submit" className="btn-primary w-full">Save</button>
      </form>
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
