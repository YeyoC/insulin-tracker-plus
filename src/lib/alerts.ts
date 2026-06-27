// Alert engine — evaluates state and stores alert history in localStorage.
import {
  getExercise,
  getGlucose,
  getHydration,
  getInsulin,
  getMeals,
  getSpecialDay,
} from "./storage";
import { PROFILES, windowFor, formatTime } from "./insulin";
import { t } from "./i18n";

export type AlertLevel = "red" | "orange" | "yellow" | "blue";
export type AlertResponse = "ignored" | "ate" | "checked";

export type AlertRecord = {
  id: string;
  key: string;
  level: AlertLevel;
  messageKey: string;
  messageParams?: Record<string, string | number>;
  firedAt: string;
  response?: AlertResponse;
  respondedAt?: string;
  resent?: boolean;
  resentAt?: string;
};

const KEY = "insulina:alerts";

const isBrowser = () => typeof window !== "undefined";

function read(): AlertRecord[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as AlertRecord[];
  } catch {
    return [];
  }
}
function write(list: AlertRecord[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("insulina:update"));
}

export const getAlerts = (): AlertRecord[] => read();

export function alertsForDay(date: Date): AlertRecord[] {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return read()
    .filter((a) => {
      const tt = new Date(a.firedAt).getTime();
      return tt >= start.getTime() && tt < end.getTime();
    })
    .sort((a, b) => new Date(b.firedAt).getTime() - new Date(a.firedAt).getTime());
}

export function respondToAlert(id: string, response: AlertResponse) {
  const list = read();
  const idx = list.findIndex((a) => a.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], response, respondedAt: new Date().toISOString() };
  write(list);
}

function fire(
  key: string,
  level: AlertLevel,
  messageKey: string,
  messageParams?: Record<string, string | number>,
) {
  const list = read();
  if (list.some((a) => a.key === key)) return;
  const rec: AlertRecord = {
    id: crypto.randomUUID(),
    key,
    level,
    messageKey,
    messageParams,
    firedAt: new Date().toISOString(),
  };
  list.unshift(rec);
  write(list);
  notify(level, t(messageKey, messageParams));
}

function notify(level: AlertLevel, message: string) {
  if (!isBrowser()) return;
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(`InsulinaApp · ${level.toUpperCase()}`, { body: message });
    }
  } catch {
    /* noop */
  }
}

export async function requestNotificationPermission() {
  if (!isBrowser() || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch {
      /* noop */
    }
  }
}

const MIN = 60_000;

export function evaluateAlerts(now: Date = new Date()) {
  if (!isBrowser()) return;
  const insulin = getInsulin();
  const glucose = getGlucose();
  const meals = getMeals();

  const lastMealAt = meals[0] ? new Date(meals[0].timestamp).getTime() : 0;
  const minsSinceMeal = (now.getTime() - lastMealAt) / MIN;

  for (const e of insulin) {
    if (e.type !== "NPH") continue;
    const w = windowFor(e);
    const minsToPeak = (w.peakStart.getTime() - now.getTime()) / MIN;
    if (minsToPeak <= 30 && minsToPeak >= 0 && minsSinceMeal > 120) {
      fire(`red:nph:${e.id}`, "red", "alertMsg.red.nphPeak", { time: formatTime(w.peakStart) });
    }
  }

  for (const g of glucose) {
    if (g.value < 70) {
      fire(`orange:glu:${g.id}`, "orange", "alertMsg.orange.low");
    }
  }

  for (const m of meals) {
    const mt = new Date(m.timestamp).getTime();
    const minsSince = (now.getTime() - mt) / MIN;
    if (minsSince < 120 || minsSince > 180) continue;
    const hasLispro = insulin.some((i) => {
      if (i.type !== "Lispro") return false;
      const diff = Math.abs(new Date(i.timestamp).getTime() - mt) / MIN;
      return diff <= 30;
    });
    if (!hasLispro) continue;
    const checked = glucose.some((g) => new Date(g.timestamp).getTime() > mt);
    if (checked) continue;
    fire(`yellow:meal:${m.id}`, "yellow", "alertMsg.yellow.postMeal");
  }

  for (const e of insulin) {
    if (e.type !== "NPH") continue;
    const w = windowFor(e);
    const tt = now.getTime();
    const active = tt >= new Date(e.timestamp).getTime() && tt < w.end.getTime();
    if (!active) continue;
    if (minsSinceMeal <= 180) continue;
    const bucket = Math.floor((tt - new Date(e.timestamp).getTime()) / (60 * MIN));
    fire(
      `blue:nph:${e.id}:${bucket}`,
      "blue",
      "alertMsg.blue.nphActive",
      { time: formatTime(new Date(tt + 60 * MIN)) },
    );
  }

  for (const ex of getExercise()) {
    const mins = (now.getTime() - new Date(ex.timestamp).getTime()) / MIN;
    if (mins >= 60 && mins <= 75) {
      fire(`exercise:${ex.id}`, "yellow", "alertMsg.yellow.exercise");
    }
  }

  if (now.getHours() >= 18) {
    const glasses = getHydration(now);
    if (glasses < 4) {
      const dayBucket = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
      fire(`hydration:${dayBucket}`, "blue", "alertMsg.blue.hydration", { n: glasses });
    }
  }

  for (const g of glucose) {
    if (g.value < 55) {
      fire(`red:critical:${g.id}`, "red", "alertMsg.red.critical", { n: g.value });
    }
  }

  const sd = getSpecialDay();
  if (sd.active) {
    const bucket = Math.floor(now.getTime() / (2 * 60 * MIN));
    fire(`special:${bucket}`, "blue", "alertMsg.blue.special");
  }

  const list = read();
  let changed = false;
  for (const a of list) {
    if (a.response) continue;
    if (a.resent) continue;
    if (a.level !== "red" && a.level !== "orange") continue;
    const age = (now.getTime() - new Date(a.firedAt).getTime()) / MIN;
    if (age >= 20) {
      a.resent = true;
      a.resentAt = new Date().toISOString();
      notify(a.level, t("alertMsg.reminderPrefix") + t(a.messageKey, a.messageParams));
      changed = true;
    }
  }
  if (changed) write(list);
}

export { PROFILES };
