import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { setProfile } from "@/lib/storage";
import { LanguageToggle } from "@/components/LanguageToggle";
import { t, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/setup")({
  head: () => ({ meta: [{ title: "Setup — InsulinaApp" }] }),
  component: SetupPage,
});

function SetupPage() {
  useLang();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [target, setTarget] = useState(100);
  const [rangeMin, setRangeMin] = useState(70);
  const [rangeMax, setRangeMax] = useState(180);
  const [icr, setIcr] = useState(15);
  const [isf, setIsf] = useState(50);

  // Prescription fields
  const [doctorName, setDoctorName] = useState("");
  const [basalType, setBasalType] = useState("NPH");
  const [basalMorning, setBasalMorning] = useState<number | "">("");
  const [basalNight, setBasalNight] = useState<number | "">("");
  const [basalDaily, setBasalDaily] = useState<number | "">("");
  const [rapidType, setRapidType] = useState("Lispro");
  const [ratioMorning, setRatioMorning] = useState<number | "">("");
  const [ratioAfternoon, setRatioAfternoon] = useState<number | "">("");
  const [ratioNight, setRatioNight] = useState<number | "">("");

  const isOnceDailyBasal = ["Glargina", "Detemir", "Degludec"].includes(basalType);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (rangeMin >= rangeMax) {
      alert("El rango mínimo debe ser menor al máximo.");
      return;
    }
    if (icr < 1) { alert("El ICR debe ser al menos 1."); return; }
    if (isf < 1) { alert("El ISF debe ser al menos 1."); return; }
    if (target < rangeMin || target > rangeMax) {
      alert("La glucosa objetivo debe estar dentro del rango normal.");
      return;
    }
    setProfile({
      name: name.trim(),
      wakeTime,
      target,
      rangeMin,
      rangeMax,
      icr,
      isf,
      doctorName: doctorName.trim() || undefined,
      basalInsulinType: basalType !== "Ninguna" ? basalType : undefined,
      prescribedBasalMorning: !isOnceDailyBasal && basalMorning !== "" ? Number(basalMorning) : undefined,
      prescribedBasalNight: !isOnceDailyBasal && basalNight !== "" ? Number(basalNight) : undefined,
      prescribedBasalDaily: isOnceDailyBasal && basalDaily !== "" ? Number(basalDaily) : undefined,
      rapidInsulinType: rapidType,
      lisproRatioMorning: ratioMorning !== "" ? Number(ratioMorning) : undefined,
      lisproRatioAfternoon: ratioAfternoon !== "" ? Number(ratioAfternoon) : undefined,
      lisproRatioNight: ratioNight !== "" ? Number(ratioNight) : undefined,
    });
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto max-w-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-primary">{t("setup.welcome")}</h1>
            <p className="mt-1 text-muted-foreground">{t("setup.subtitle")}</p>
          </div>
          <LanguageToggle />
        </div>

        <form onSubmit={submit} className="mt-8 space-y-5">
          {/* Basic info */}
          <Field label={t("setup.name")}>
            <input value={name} onChange={(e) => setName(e.target.value)}
              required className="input" placeholder={t("setup.namePlaceholder")} />
          </Field>
          <Field label={t("setup.wakeTime")}>
            <input type="time" value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)} className="input" />
          </Field>
          <Field label={t("setup.target")}>
            <input type="number" value={target}
              onChange={(e) => setTarget(Number(e.target.value))} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("setup.rangeMin")}>
              <input type="number" value={rangeMin}
                onChange={(e) => setRangeMin(Number(e.target.value))} className="input" />
            </Field>
            <Field label={t("setup.rangeMax")}>
              <input type="number" value={rangeMax}
                onChange={(e) => setRangeMax(Number(e.target.value))} className="input" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("setup.icr")}>
              <input type="number" min={1} value={icr}
                onChange={(e) => setIcr(Number(e.target.value))} className="input" />
            </Field>
            <Field label={t("setup.isf")}>
              <input type="number" min={1} value={isf}
                onChange={(e) => setIsf(Number(e.target.value))} className="input" />
            </Field>
          </div>

          {/* Prescription section */}
          <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div>
              <h2 className="font-semibold text-primary">🩺 Receta médica (opcional)</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Puedes completarlo ahora o más tarde en Ajustes.
              </p>
            </div>

            <Field label="Nombre del médico">
              <input type="text" className="input text-sm" placeholder="Dr. ..."
                value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
            </Field>

            {/* Basal insulin */}
            <div className="space-y-3 rounded-lg border border-border bg-card p-3">
              <p className="text-sm font-semibold">Insulina basal</p>
              <div className="flex flex-wrap gap-2">
                {["NPH", "Glargina", "Detemir", "Degludec", "Ninguna"].map((tp) => (
                  <button key={tp} type="button" onClick={() => setBasalType(tp)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors
                      ${basalType === tp
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-accent"}`}>
                    {tp}
                  </button>
                ))}
              </div>
              {basalType !== "Ninguna" && (
                <div className="grid grid-cols-2 gap-3">
                  {isOnceDailyBasal ? (
                    <label className="col-span-2 block">
                      <span className="mb-1.5 block text-xs font-medium">Dosis diaria (U)</span>
                      <input type="number" inputMode="decimal" step={0.5} min={0} className="input"
                        placeholder="ej. 20" value={basalDaily}
                        onChange={(e) => setBasalDaily(e.target.value === "" ? "" : Number(e.target.value))} />
                    </label>
                  ) : (
                    <>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium">Dosis mañana (U)</span>
                        <input type="number" inputMode="decimal" step={0.5} min={0} className="input"
                          placeholder="ej. 40" value={basalMorning}
                          onChange={(e) => setBasalMorning(e.target.value === "" ? "" : Number(e.target.value))} />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium">Dosis noche (U)</span>
                        <input type="number" inputMode="decimal" step={0.5} min={0} className="input"
                          placeholder="ej. 20" value={basalNight}
                          onChange={(e) => setBasalNight(e.target.value === "" ? "" : Number(e.target.value))} />
                      </label>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Rapid insulin */}
            <div className="space-y-3 rounded-lg border border-border bg-card p-3">
              <p className="text-sm font-semibold">Insulina rápida</p>
              <div className="flex flex-wrap gap-2">
                {["Lispro", "Aspart", "Glulisina", "Regular"].map((tp) => (
                  <button key={tp} type="button" onClick={() => setRapidType(tp)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors
                      ${rapidType === tp
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-accent"}`}>
                    {tp}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">¿Cuántos gramos de CHO cubre 1 unidad?</p>
              <div className="grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium">Mañana</span>
                  <input type="number" inputMode="decimal" min={1} className="input text-sm"
                    placeholder="ej. 10" value={ratioMorning}
                    onChange={(e) => setRatioMorning(e.target.value === "" ? "" : Number(e.target.value))} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium">Tarde</span>
                  <input type="number" inputMode="decimal" min={1} className="input text-sm"
                    placeholder="ej. 15" value={ratioAfternoon}
                    onChange={(e) => setRatioAfternoon(e.target.value === "" ? "" : Number(e.target.value))} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium">Noche</span>
                  <input type="number" inputMode="decimal" min={1} className="input text-sm"
                    placeholder="ej. 20" value={ratioNight}
                    onChange={(e) => setRatioNight(e.target.value === "" ? "" : Number(e.target.value))} />
                </label>
              </div>
              {(ratioMorning || ratioAfternoon || ratioNight) && (
                <div className="rounded-lg bg-accent p-2 text-xs space-y-0.5">
                  <p className="font-medium">Ejemplo: Corn Flakes 100g = 84g CHO</p>
                  {ratioMorning && <p>Mañana: ~{(Math.round(84 / Number(ratioMorning) * 2) / 2).toFixed(1)}U</p>}
                  {ratioAfternoon && <p>Tarde: ~{(Math.round(84 / Number(ratioAfternoon) * 2) / 2).toFixed(1)}U</p>}
                  {ratioNight && <p>Noche: ~{(Math.round(84 / Number(ratioNight) * 2) / 2).toFixed(1)}U</p>}
                </div>
              )}
            </div>
          </div>

          <button type="submit" className="btn-primary w-full mt-4">{t("setup.start")}</button>
        </form>
      </div>
    </div>
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
