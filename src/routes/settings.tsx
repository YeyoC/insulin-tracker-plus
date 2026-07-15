import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LanguageToggle } from "@/components/LanguageToggle";
import {
  averageDailyLispro,
  clearPin,
  deleteSavedDish,
  getExercise,
  getGlucose,
  getInsulin,
  getMeals,
  getPin,
  getProfile,
  getSavedDishes,
  setPin,
  setProfile,
  totalCarbs,
  type Profile,
  type SavedDish,
} from "@/lib/storage";
import { t, useLang } from "@/lib/i18n";
import { INSULIN_CATALOG } from "@/lib/insulin";


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
      profile:  getProfile(),
      glucose:  getGlucose(),
      insulin:  getInsulin(),
      meals:    getMeals(),
      exercise: getExercise(),
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

        <PrescriptionSection profile={p} update={update} />

        <PinSection />

        <button
          type="button"
          onClick={exportData}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-accent"
        >
          📦 Exportar mis datos (backup)
        </button>

        <div className="space-y-3">
          <h2 className="font-semibold">Saved dishes ({savedDishes.length})</h2>
          {savedDishes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No saved dishes yet. Save a meal combination to reuse it quickly.
            </p>
          ) : (
            <ul className="space-y-2">
              {savedDishes.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.foods.length} foods · {Math.round(totalCarbs(d.foods))}g CHO total
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete "${d.name}"?`)) deleteSavedDish(d.id);
                    }}
                    className="ml-3 text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

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

const RAPID_TYPES: string[] = [
  ...(INSULIN_CATALOG.find((c) => (c.types as readonly string[]).includes("Lispro"))?.types ??
    ["Lispro", "Aspart", "Glulisina", "Regular"]),
];
const LONG_ACTING_TYPES: string[] = [
  ...(INSULIN_CATALOG.find((c) => (c.types as readonly string[]).includes("Glargina"))?.types ??
    ["Glargina", "Detemir", "Degludec"]),
];
const BASAL_TYPES: string[] = ["NPH", ...LONG_ACTING_TYPES, "Ninguna"];
const ONCE_DAILY_BASAL = new Set(LONG_ACTING_TYPES);

function PrescriptionSection({
  profile,
  update,
}: {
  profile: Profile;
  update: <K extends keyof Profile>(k: K, v: Profile[K]) => void;
}) {
  const basalType = profile.basalInsulinType || "Ninguna";
  const rapidType = profile.rapidInsulinType || "Lispro";
  const isOnceDaily = ONCE_DAILY_BASAL.has(basalType);

  // Corn Flakes 100g = 84g CHO, live example using the morning ratio
  const exampleCarbs = 84;
  const exampleRatio = Math.max(1, profile.lisproRatioMorning || profile.icr || 15);
  const exampleUnits = exampleCarbs / exampleRatio;

  return (
    <fieldset className="rounded-xl border border-border p-4 space-y-4">
      <legend className="px-2 text-sm font-semibold text-primary">Receta médica</legend>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Nombre del médico">
          <input
            value={profile.doctorName ?? ""}
            onChange={(e) => update("doctorName", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Última visita">
          <input
            type="date"
            value={profile.lastDoctorVisit ?? ""}
            onChange={(e) => update("lastDoctorVisit", e.target.value)}
            className="input"
          />
        </Field>
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium">Insulina basal</span>
        <div className="flex flex-wrap gap-2">
          {BASAL_TYPES.map((tp) => (
            <button
              key={tp}
              type="button"
              onClick={() => update("basalInsulinType", tp === "Ninguna" ? undefined : tp)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors
                ${basalType === tp
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-accent"}`}
            >
              {tp}
            </button>
          ))}
        </div>
      </div>

      {basalType !== "Ninguna" && (
        isOnceDaily ? (
          <Field label="Dosis diaria (U)">
            <input
              type="number"
              min={0}
              value={profile.prescribedBasalDaily ?? ""}
              onChange={(e) =>
                update("prescribedBasalDaily", e.target.value === "" ? undefined : Number(e.target.value))
              }
              className="input"
            />
          </Field>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Dosis mañana (U)">
              <input
                type="number"
                min={0}
                value={profile.prescribedBasalMorning ?? ""}
                onChange={(e) =>
                  update("prescribedBasalMorning", e.target.value === "" ? undefined : Number(e.target.value))
                }
                className="input"
              />
            </Field>
            <Field label="Dosis noche (U)">
              <input
                type="number"
                min={0}
                value={profile.prescribedBasalNight ?? ""}
                onChange={(e) =>
                  update("prescribedBasalNight", e.target.value === "" ? undefined : Number(e.target.value))
                }
                className="input"
              />
            </Field>
          </div>
        )
      )}

      <div>
        <span className="mb-2 block text-sm font-medium">Insulina rápida</span>
        <div className="flex flex-wrap gap-2">
          {RAPID_TYPES.map((tp) => (
            <button
              key={tp}
              type="button"
              onClick={() => update("rapidInsulinType", tp)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors
                ${rapidType === tp
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-accent"}`}
            >
              {tp}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Ratio mañana (g/U)">
          <input
            type="number"
            min={1}
            value={profile.lisproRatioMorning ?? ""}
            onChange={(e) =>
              update("lisproRatioMorning", e.target.value === "" ? undefined : Number(e.target.value))
            }
            className="input"
          />
        </Field>
        <Field label="Ratio tarde (g/U)">
          <input
            type="number"
            min={1}
            value={profile.lisproRatioAfternoon ?? ""}
            onChange={(e) =>
              update("lisproRatioAfternoon", e.target.value === "" ? undefined : Number(e.target.value))
            }
            className="input"
          />
        </Field>
        <Field label="Ratio noche (g/U)">
          <input
            type="number"
            min={1}
            value={profile.lisproRatioNight ?? ""}
            onChange={(e) =>
              update("lisproRatioNight", e.target.value === "" ? undefined : Number(e.target.value))
            }
            className="input"
          />
        </Field>
      </div>

      <div className="rounded-lg bg-accent p-3 text-sm text-accent-foreground">
        Corn Flakes 100g = {exampleCarbs}g CHO → {exampleUnits.toFixed(1)}U
      </div>
    </fieldset>
  );
}

function PinSection() {
  const [pin, setPinState] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setPinState(getPin()), []);

  const isValidPin = (v: string) => /^\d{4}$/.test(v);

  const save = () => {
    if (!isValidPin(newPin) || !isValidPin(confirmPin)) {
      setError("El PIN debe tener exactamente 4 dígitos.");
      return;
    }
    if (newPin !== confirmPin) {
      setError("Los PINs no coinciden.");
      return;
    }
    setPin(newPin);
    setPinState(newPin);
    setEditing(false);
    setNewPin("");
    setConfirmPin("");
    setError(null);
  };

  const remove = () => {
    clearPin();
    setPinState(null);
    setEditing(false);
    setNewPin("");
    setConfirmPin("");
    setError(null);
  };

  return (
    <fieldset className="rounded-xl border border-border p-4 space-y-4">
      <legend className="px-2 text-sm font-semibold text-primary">Bloqueo con PIN</legend>

      {pin && !editing ? (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">PIN activo ••••</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent"
            >
              Cambiar PIN
            </button>
            <button
              type="button"
              onClick={remove}
              className="rounded-lg border border-danger/40 px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/10"
            >
              Quitar PIN
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nuevo PIN">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                className="input"
              />
            </Field>
            <Field label="Confirmar PIN">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                className="input"
              />
            </Field>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setNewPin("");
                  setConfirmPin("");
                  setError(null);
                }}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent"
              >
                Cancelar
              </button>
            )}
            <button
              type="button"
              onClick={save}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Guardar PIN
            </button>
          </div>
        </div>
      )}
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
