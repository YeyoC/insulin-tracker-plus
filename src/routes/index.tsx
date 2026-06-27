import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DayTimeline } from "@/components/DayTimeline";
import { ActiveInsulinBar } from "@/components/ActiveInsulinBar";
import { HomeExtras } from "@/components/HomeExtras";
import { CriticalGlucoseOverlay } from "@/components/CriticalGlucoseOverlay";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useProfile } from "@/hooks/useProfile";
import { getGlucose, glucoseStatus, type GlucoseEntry } from "@/lib/storage";
import { t, locale, useLang } from "@/lib/i18n";

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
