import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DayTimeline } from "@/components/DayTimeline";
import { ActiveInsulinBar } from "@/components/ActiveInsulinBar";
import { HomeExtras } from "@/components/HomeExtras";
import { CriticalGlucoseOverlay } from "@/components/CriticalGlucoseOverlay";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useProfile } from "@/hooks/useProfile";
import { getGlucose, glucoseStatus, type GlucoseEntry } from "@/lib/storage";
import { t, locale, useLang } from "@/lib/i18n";
import { analyzeNphPattern, type NphSuggestion } from "@/lib/stats";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InsulinaApp — Home" },
      { name: "description", content: "Track glucose and insulin with InsulinaApp." },
    ],
  }),
  component: Home,
});

function Home() {
  const lang = useLang();
  const navigate = useNavigate();
  const { profile, ready } = useProfile();
  const [now, setNow] = useState<Date | null>(null);
  const [latest, setLatest] = useState<GlucoseEntry | null>(null);
  const [nphSuggestion, setNphSuggestion] = useState<NphSuggestion | null>(null);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);

  useEffect(() => {
    setNow(new Date());
    const tt = setInterval(() => setNow(new Date()), 30_000);
    const refresh = () => {
      const list = getGlucose();
      setLatest(list[0] ?? null);
    };
    refresh();
    window.addEventListener("insulina:update", refresh);
    return () => {
      clearInterval(tt);
      window.removeEventListener("insulina:update", refresh);
    };
  }, []);

  useEffect(() => {
    if (ready && !profile) navigate({ to: "/setup" });
  }, [ready, profile, navigate]);

  useEffect(() => {
    if (profile) {
      setNphSuggestion(analyzeNphPattern(profile.rangeMin, profile.rangeMax));
    }
  }, [profile]);

  if (!profile) return null;

  const status = latest
    ? glucoseStatus(latest.value, profile.rangeMin, profile.rangeMax)
    : null;

  const statusColor =
    status === "ok"
      ? "bg-success text-success-foreground"
      : status === "warn"
        ? "bg-warning text-warning-foreground"
        : status === "danger"
          ? "bg-danger text-danger-foreground"
          : "bg-muted text-muted-foreground";

  return (
    <AppShell>
      <header>
        <p className="text-sm text-muted-foreground">
          {now?.toLocaleString(locale(lang), {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <h1 className="text-3xl font-bold text-primary">{t("home.greeting", { name: profile.name })}</h1>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link to="/settings" className="text-sm font-medium text-secondary hover:underline">
              {t("common.settings")}
            </Link>
          </div>
        </div>
      </header>

      <section className={`mt-6 rounded-2xl p-6 shadow-sm ${statusColor}`}>
        <p className="text-sm opacity-90">{t("home.lastGlucose")}</p>
        {latest ? (
          <>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-5xl font-bold">{latest.value}</span>
              <span className="text-lg opacity-90">mg/dL</span>
            </div>
            <p className="mt-2 text-sm opacity-90">
              {t(`moment.${latest.moment}`)} ·{" "}
              {new Date(latest.timestamp).toLocaleString(locale(lang), {
                hour: "2-digit",
                minute: "2-digit",
                day: "numeric",
                month: "short",
              })}
            </p>
          </>
        ) : (
          <p className="mt-2 text-lg">{t("home.noReadings")}</p>
        )}
      </section>

      <div className="mt-6 grid grid-cols-4 gap-2">
        <Link to="/glucose" className="card-action text-sm">{t("home.actionGlucose")}</Link>
        <Link to="/insulin" className="card-action text-sm">{t("home.actionInsulin")}</Link>
        <Link to="/meals/new" className="card-action text-sm">{t("home.actionMeal")}</Link>
        <Link to="/exercise" className="card-action text-sm">{t("home.actionExercise")}</Link>
      </div>

      <HomeExtras />
      <CriticalGlucoseOverlay />

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("home.activeInsulin")}
        </h2>
        <ActiveInsulinBar />
      </section>

      {/* Prescription summary card */}
      {(profile.prescribedBasalMorning || profile.prescribedBasalDaily || profile.lisproRatioMorning) && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
          <button
            type="button"
            onClick={() => setPrescriptionOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              🩺 Mi receta médica
              {profile.doctorName && (
                <span className="text-xs text-muted-foreground">· {profile.doctorName}</span>
              )}
            </span>
            <ChevronDown className={`size-4 text-muted-foreground transition-transform ${prescriptionOpen ? "rotate-180" : ""}`} />
          </button>
          {prescriptionOpen && (
            <div className="border-t border-border px-4 pb-4 pt-3 space-y-2 text-sm">
              {(profile.prescribedBasalMorning || profile.prescribedBasalNight) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{profile.basalInsulinType || "NPH"}</span>
                  <span className="font-medium">
                    {profile.prescribedBasalMorning}U mañana
                    {profile.prescribedBasalNight ? ` · ${profile.prescribedBasalNight}U noche` : ""}
                  </span>
                </div>
              )}
              {profile.prescribedBasalDaily && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{profile.basalInsulinType || "Basal"}</span>
                  <span className="font-medium">{profile.prescribedBasalDaily}U/día</span>
                </div>
              )}
              {(profile.lisproRatioMorning || profile.lisproRatioAfternoon || profile.lisproRatioNight) && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">{profile.rapidInsulinType || "Lispro"}</span>
                  <span className="font-medium text-right text-xs">
                    {profile.lisproRatioMorning && `1U/${profile.lisproRatioMorning}g mañana`}
                    {profile.lisproRatioAfternoon && ` · 1U/${profile.lisproRatioAfternoon}g tarde`}
                    {profile.lisproRatioNight && ` · 1U/${profile.lisproRatioNight}g noche`}
                  </span>
                </div>
              )}
              <Link to="/settings" className="flex items-center gap-1 pt-1 text-xs text-primary hover:underline">
                Editar receta <ChevronRight className="size-3" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* NPH adjustment suggestion */}
      {nphSuggestion && nphSuggestion.direction !== "stable" && (
        <div className={`mt-4 rounded-xl border p-4 space-y-2 ${
          nphSuggestion.direction === "increase"
            ? "border-warning/40 bg-warning/10"
            : "border-blue-200 bg-blue-50"
        }`}>
          <div className="flex items-start gap-2">
            <span className="shrink-0 text-lg">
              {nphSuggestion.direction === "increase" ? "📈" : "📉"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {nphSuggestion.direction === "increase"
                  ? "Considera ajustar tu dosis de NPH"
                  : "Tu NPH podría estar alta"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{nphSuggestion.reason}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Basado en {nphSuggestion.daysAnalyzed} lecturas en ayuno de los últimos 7 días.
              </p>
              {profile.prescribedBasalMorning && (
                <p className="mt-2 text-xs font-medium">
                  Tu NPH mañana recetada: {profile.prescribedBasalMorning}U
                  {nphSuggestion.direction === "increase"
                    ? ` → podrías intentar ${profile.prescribedBasalMorning + nphSuggestion.units}U`
                    : ` → podrías intentar ${Math.max(0, profile.prescribedBasalMorning - nphSuggestion.units)}U`}
                </p>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-white/60 p-2 text-xs text-muted-foreground">
            ⚕️ Solo es una sugerencia. Consulta siempre a tu endocrinólogo antes de cambiar tu dosis.
          </div>
        </div>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("home.today")}
        </h2>
        <DayTimeline profile={profile} />
      </section>


      <Link
        to="/glucose"
        aria-label={t("home.addEntry")}
        className="fixed bottom-24 right-1/2 translate-x-[11rem] z-30 grid size-16 place-items-center rounded-full bg-secondary text-secondary-foreground shadow-lg shadow-secondary/30 hover:bg-primary transition-colors"
      >
        <Plus className="size-8" />
      </Link>
    </AppShell>
  );
}
