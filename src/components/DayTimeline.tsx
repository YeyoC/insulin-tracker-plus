import { useEffect, useState } from "react";
import { Droplet, Syringe, Utensils } from "lucide-react";
import {
  deleteGlucose,
  deleteInsulin,
  deleteMeal,
  getTimelineForDay,
  glucoseStatus,
  totalCarbs,
  type TimelineEvent,
  type Profile,
} from "@/lib/storage";
import { SwipeRow } from "./SwipeRow";
import { t, locale, useLang } from "@/lib/i18n";

export function DayTimeline({ profile }: { profile: Profile | null }) {
  const lang = useLang();
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    const refresh = () => setEvents(getTimelineForDay(new Date()));
    refresh();
    window.addEventListener("insulina:update", refresh);
    return () => window.removeEventListener("insulina:update", refresh);
  }, []);

  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
        {t("home.noEventsToday")}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {events.map((ev) => (
        <li key={`${ev.kind}-${ev.id}`}>
          <SwipeRow onDelete={() => onDelete(ev)}>
            <Row event={ev} profile={profile} lang={lang} />
          </SwipeRow>
        </li>
      ))}
    </ul>
  );
}

function onDelete(ev: TimelineEvent) {
  const label =
    ev.kind === "glucose" ? "esta lectura de glucosa"
    : ev.kind === "insulin" ? "este registro de insulina"
    : "esta comida";
  if (!window.confirm(`¿Eliminar ${label}?`)) return;
  if (ev.kind === "glucose") deleteGlucose(ev.id);
  if (ev.kind === "insulin") deleteInsulin(ev.id);
  if (ev.kind === "meal") deleteMeal(ev.id);
}

function Row({ event, profile, lang }: { event: TimelineEvent; profile: Profile | null; lang: string }) {
  const time = new Date(event.timestamp).toLocaleTimeString(locale(lang as "es" | "en"), {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (event.kind === "glucose") {
    const g = event.data;
    const s = glucoseStatus(g.value, profile?.rangeMin ?? 70, profile?.rangeMax ?? 180);
    const color =
      s === "ok" ? "text-success" : s === "warn" ? "text-warning" : "text-danger";
    return (
      <div className="flex items-center gap-3 p-3">
        <IconBubble className="bg-accent">
          <Droplet className={`size-5 ${color}`} />
        </IconBubble>
        <div className="flex-1">
          <p className="font-semibold">
            {g.value} <span className="text-xs font-normal text-muted-foreground">mg/dL</span>
          </p>
          <p className="text-xs text-muted-foreground">{t(`moment.${g.moment}`)}</p>
        </div>
        <span className="text-xs text-muted-foreground">{time}</span>
      </div>
    );
  }

  if (event.kind === "insulin") {
    const i = event.data;
    return (
      <div className="flex items-center gap-3 p-3">
        <IconBubble className="bg-secondary/15">
          <Syringe className="size-5 text-secondary" />
        </IconBubble>
        <div className="flex-1">
          <p className="font-semibold">
            {i.type} · {i.units}U
          </p>
          <p className="text-xs text-muted-foreground">{t(`site.${i.site}`)}</p>
        </div>
        <span className="text-xs text-muted-foreground">{time}</span>
      </div>
    );
  }

  const m = event.data;
  return (
    <div className="flex items-center gap-3 p-3">
      <IconBubble className="bg-primary/10">
        <Utensils className="size-5 text-primary" />
      </IconBubble>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{Math.round(totalCarbs(m.foods))}{t("meals.carbsUnit")}</p>
        <p className="truncate text-xs text-muted-foreground">
          {m.foods.map((f) => f.name).join(", ")}
        </p>
      </div>
      <span className="text-xs text-muted-foreground">{time}</span>
    </div>
  );
}

function IconBubble({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`grid size-10 shrink-0 place-items-center rounded-full ${className}`}>
      {children}
    </span>
  );
}
