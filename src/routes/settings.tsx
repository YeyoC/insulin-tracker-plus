import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  averageDailyLispro,
  getProfile,
  setProfile,
  type Profile,
} from "@/lib/storage";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — InsulinaApp" }] }),
  component: SettingsPage,
});

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

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

        <fieldset className="rounded-xl border border-border p-4">
          <legend className="px-2 text-sm font-semibold text-primary">Hydration</legend>
          <Field label="Daily goal (glasses)">
            <input
              type="number"
              min={1}
              value={p.hydrationGoal ?? 8}
              onChange={(e) => update("hydrationGoal", Number(e.target.value))}
              className="input"
            />
          </Field>
        </fieldset>

        <fieldset className="rounded-xl border border-border p-4 space-y-4">
          <legend className="px-2 text-sm font-semibold text-primary">Emergency contact</legend>
          <Field label="Name">
            <input
              value={p.emergencyContact?.name ?? ""}
              onChange={(e) =>
                update("emergencyContact", {
                  name: e.target.value,
                  phone: p.emergencyContact?.phone ?? "",
                })
              }
              className="input"
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={p.emergencyContact?.phone ?? ""}
              onChange={(e) =>
                update("emergencyContact", {
                  name: p.emergencyContact?.name ?? "",
                  phone: e.target.value,
                })
              }
              className="input"
            />
          </Field>
        </fieldset>

        <InventorySection profile={p} update={update} />

        <button type="submit" className="btn-primary w-full">Save</button>
      </form>
    </AppShell>
  );
}

function InventorySection({
  profile,
  update,
}: {
  profile: Profile;
  update: <K extends keyof Profile>(k: K, v: Profile[K]) => void;
}) {
  const inv = profile.inventory ?? { units: 0 };
  const avg = useMemo(() => averageDailyLispro(), []);
  const today = new Date();

  const openedWarn = inv.openedDate
    ? daysBetween(new Date(inv.openedDate), today) > 28
    : false;
  const expWarn = inv.expirationDate
    ? daysBetween(today, new Date(inv.expirationDate)) <= 15
    : false;
  const daysRemaining =
    inv.units > 0 && avg > 0 ? Math.floor(inv.units / avg) : null;

  const set = <K extends keyof typeof inv>(k: K, v: (typeof inv)[K]) =>
    update("inventory", { ...inv, [k]: v });

  return (
    <fieldset className="rounded-xl border border-border p-4 space-y-4">
      <legend className="px-2 text-sm font-semibold text-primary">Insulin inventory</legend>
      <Field label="Remaining units in vial/pen">
        <input
          type="number"
          min={0}
          value={inv.units}
          onChange={(e) => set("units", Number(e.target.value))}
          className="input"
        />
      </Field>
      <Field label="Vial opened on">
        <input
          type="date"
          value={inv.openedDate ?? ""}
          onChange={(e) => set("openedDate", e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Expiration date">
        <input
          type="date"
          value={inv.expirationDate ?? ""}
          onChange={(e) => set("expirationDate", e.target.value)}
          className="input"
        />
      </Field>

      <div className="space-y-2 text-sm">
        {daysRemaining !== null && (
          <p className="text-muted-foreground">
            Estimated days remaining: <strong>{daysRemaining}</strong>{" "}
            <span className="text-xs">(avg {avg.toFixed(1)}U/day Lispro)</span>
          </p>
        )}
        {openedWarn && (
          <p className="rounded-md bg-warning/15 px-3 py-2 text-warning-foreground">
            ⚠ Vial has been open for more than 28 days.
          </p>
        )}
        {expWarn && (
          <p className="rounded-md bg-danger/15 px-3 py-2 text-danger">
            ⚠ Expiration within 15 days.
          </p>
        )}
      </div>
    </fieldset>
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
