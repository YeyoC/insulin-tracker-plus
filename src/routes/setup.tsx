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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setProfile({ name: name.trim(), wakeTime, target, rangeMin, rangeMax, icr, isf });
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
          <Field label={t("setup.name")}>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="input" placeholder={t("setup.namePlaceholder")} />
          </Field>
          <Field label={t("setup.wakeTime")}>
            <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="input" />
          </Field>
          <Field label={t("setup.target")}>
            <input type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("setup.rangeMin")}><input type="number" value={rangeMin} onChange={(e) => setRangeMin(Number(e.target.value))} className="input" /></Field>
            <Field label={t("setup.rangeMax")}><input type="number" value={rangeMax} onChange={(e) => setRangeMax(Number(e.target.value))} className="input" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("setup.icr")}>
              <input type="number" min={1} value={icr} onChange={(e) => setIcr(Number(e.target.value))} className="input" />
            </Field>
            <Field label={t("setup.isf")}>
              <input type="number" min={1} value={isf} onChange={(e) => setIsf(Number(e.target.value))} className="input" />
            </Field>
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
