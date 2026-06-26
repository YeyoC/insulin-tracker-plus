// Alert engine — evaluates state and stores alert history in localStorage.
import {
  getExercise,
  getGlucose,
  getHydration,
  getInsulin,
  getMeals,
  getProfile,
  getSpecialDay,
} from "./storage";
import { PROFILES, windowFor, formatTime } from "./insulin";

export type AlertLevel = "red" | "orange" | "yellow" | "blue";
export type AlertResponse = "ignored" | "ate" | "checked";

export type AlertRecord = {
  id: string;
  key: string; // dedupe key (level + source id)
  level: AlertLevel;
  message: string;
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
      const t = new Date(a.firedAt).getTime();
      return t >= start.getTime() && t < end.getTime();
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

function fire(key: string, level: AlertLevel, message: string) {
  const list = read();
  if (list.some((a) => a.key === key)) return; // dedupe forever per key
  const rec: AlertRecord = {
    id: crypto.randomUUID(),
    key,
    level,
    message,
    firedAt: new Date().toISOString(),
  };
  list.unshift(rec);
  write(list);
  notify(level, message);
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

/** Evaluate state and fire alerts as needed. Idempotent (dedupes by key). */
export function evaluateAlerts(now: Date = new Date()) {
  if (!isBrowser()) return;
  const insulin = getInsulin();
  const glucose = getGlucose();
  const meals = getMeals();

  const lastMealAt = meals[0] ? new Date(meals[0].timestamp).getTime() : 0;
  const minsSinceMeal = (now.getTime() - lastMealAt) / MIN;

  // RED — 30 min before NPH peak, no meal in past 2h
  for (const e of insulin) {
    if (e.type !== "NPH") continue;
    const w = windowFor(e);
    const minsToPeak = (w.peakStart.getTime() - now.getTime()) / MIN;
    if (minsToPeak <= 30 && minsToPeak >= 0 && minsSinceMeal > 120) {
      fire(
        `red:nph:${e.id}`,
        "red",
        `Your NPH peaks at ${formatTime(w.peakStart)}. Eat something now.`,
      );
    }
  }

  // ORANGE — glucose < 70
  for (const g of glucose) {
    if (g.value < 70) {
      fire(
        `orange:glu:${g.id}`,
        "orange",
        "Low glucose. Take 15g of fast-acting sugar and recheck in 15 minutes.",
      );
    }
  }

  // YELLOW — 2h after a meal with Lispro nearby and no glucose check since meal
  for (const m of meals) {
    const mt = new Date(m.timestamp).getTime();
    const minsSince = (now.getTime() - mt) / MIN;
    if (minsSince < 120 || minsSince > 180) continue;
    // Lispro logged within ±30 min of the meal
    const hasLispro = insulin.some((i) => {
      if (i.type !== "Lispro") return false;
      const diff = Math.abs(new Date(i.timestamp).getTime() - mt) / MIN;
      return diff <= 30;
    });
    if (!hasLispro) continue;
    const checked = glucose.some((g) => new Date(g.timestamp).getTime() > mt);
    if (checked) continue;
    fire(
      `yellow:meal:${m.id}`,
      "yellow",
      "2 hours since your meal. Good time to check your glucose.",
    );
  }

  // BLUE — NPH active and no meal in past 3h
  for (const e of insulin) {
    if (e.type !== "NPH") continue;
    const w = windowFor(e);
    const t = now.getTime();
    const active = t >= new Date(e.timestamp).getTime() && t < w.end.getTime();
    if (!active) continue;
    if (minsSinceMeal <= 180) continue;
    // Hourly bucket key while NPH active
    const bucket = Math.floor((t - new Date(e.timestamp).getTime()) / (60 * MIN));
    fire(
      `blue:nph:${e.id}:${bucket}`,
      "blue",
      `NPH is active. We recommend eating something before ${formatTime(
        new Date(t + 60 * MIN),
      )}.`,
    );
  }

  // RESEND — red/orange unanswered after 20 min, once
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
      notify(a.level, `[Reminder] ${a.message}`);
      changed = true;
    }
  }
  if (changed) write(list);
}

// Suppress unused-import warnings for PROFILES (kept for re-export).
export { PROFILES };
