import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LanguageToggle } from "@/components/LanguageToggle";
import {
  averageDailyLispro,
  deleteSavedDish,
  getProfile,
  getSavedDishes,
  setProfile,
  totalCarbs,
  type Profile,
  type SavedDish,
} from "@/lib/storage";
import { t, useLang } from "@/lib/i18n";


export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — InsulinaApp" }] }),
  component: SettingsPage,
});

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

function SettingsPage() {
  useLang();
  const navigate = useNavigate();
  const [p, setP] = useState<Profile | null>(null);
  const [savedDishes, setSavedDishes] = useState<SavedDish[]>([]);

  useEffect(() => setP(getProfile()), []);
  useEffect(() => {
    setSavedDishes(getSavedDishes());
    const refresh = () => setSavedDishes(getSavedDishes());
    window.addEventListener("insulina:update", refresh);
    return () => window.removeEventListener("insulina:update", refresh);
  }, []);


  function exportData() {
    const data = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      profile: localStorage.getItem("insulina:profile"),
      glucose: localStorage.getItem("insulina:glucose"),
      insulin: localStorage.getItem("insulina:insulin"),
      meals: localStorage.getItem("insulina:meals"),
      exercise: localStorage.getItem("insulina:exercise"),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `InsulinaApp_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!p) return null;

  const update = <K extends keyof Profile>(k: K, v: Profile[K]) => setP({ ...p, [k]: v });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (p.rangeMin >= p.rangeMax) {
      alert("El rango mínimo debe ser menor al máximo.");
      return;
    }
    if (p.icr < 1) { alert("El ICR debe ser al menos 1."); return; }
    if (p.isf < 1) { alert("El ISF debe ser al menos 1."); return; }
    if (p.target < p.rangeMin || p.target > p.rangeMax) {
      alert("La glucosa objetivo debe estar dentro del rango normal.");
      return;
    }
    setProfile(p);
    navigate({ to: "/" });
  };

  return (
    <AppShell>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">{t("settings.title")}</h1>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-muted-foreground">{t("common.language")}</span>
          <LanguageToggle />
        </div>
      </div>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <Field label={t("setup.name")}>
          <input value={p.name} onChange={(e) => update("name", e.target.value)} className="input" />
        </Field>
        <Field label={t("setup.wakeTime")}>
          <input type="time" value={p.wakeTime} onChange={(e) => update("wakeTime", e.target.value)} className="input" />
        </Field>
        <Field label={t("setup.target")}>
          <input type="number" value={p.target} onChange={(e) => update("target", Number(e.target.value))} className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("setup.rangeMin")}><input type="number" value={p.rangeMin} onChange={(e) => update("rangeMin", Number(e.target.value))} className="input" /></Field>
          <Field label={t("setup.rangeMax")}><input type="number" value={p.rangeMax} onChange={(e) => update("rangeMax", Number(e.target.value))} className="input" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("setup.icr")}>
            <input type="number" min={1} value={p.icr} onChange={(e) => update("icr", Number(e.target.value))} className="input" />
          </Field>
          <Field label={t("setup.isf")}>
            <input type="number" min={1} value={p.isf} onChange={(e) => update("isf", Number(e.target.value))} className="input" />
          </Field>
        </div>

        <fieldset className="rounded-xl border border-border p-4">
          <legend className="px-2 text-sm font-semibold text-primary">{t("settings.hydration")}</legend>
          <Field label={t("settings.hydrationGoal")}>
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
          <legend className="px-2 text-sm font-semibold text-primary">{t("settings.emergency")}</legend>
          <Field label={t("settings.contactName")}>
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
          <Field label={t("settings.contactPhone")}>
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

        <button
          type="button"
          onClick={exportData}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-accent"
        >
          📦 Exportar mis datos (backup)
        </button>

        <button type="submit" className="btn-primary w-full">{t("common.save")}</button>
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
      <legend className="px-2 text-sm font-semibold text-primary">{t("settings.inventory")}</legend>
      <Field label={t("settings.units")}>
        <input
          type="number"
          min={0}
          value={inv.units}
          onChange={(e) => set("units", Number(e.target.value))}
          className="input"
        />
      </Field>
      <Field label={t("settings.openedDate")}>
        <input
          type="date"
          value={inv.openedDate ?? ""}
          onChange={(e) => set("openedDate", e.target.value)}
          className="input"
        />
      </Field>
      <Field label={t("settings.expDate")}>
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
            {t("settings.daysRemaining", { n: daysRemaining })}{" "}
            <span className="text-xs">{t("settings.avgPerDay", { n: avg.toFixed(1) })}</span>
          </p>
        )}
        {openedWarn && (
          <p className="rounded-md bg-warning/15 px-3 py-2 text-warning-foreground">
            {t("settings.warnOpened")}
          </p>
        )}
        {expWarn && (
          <p className="rounded-md bg-danger/15 px-3 py-2 text-danger">
            {t("settings.warnExp")}
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
