// Local storage helpers — client-only

export type Profile = {
  name: string;
  wakeTime: string; // "HH:MM"
  target: number;
  rangeMin: number;
  rangeMax: number;
};

export type GlucoseEntry = {
  id: string;
  value: number;
  moment: "Fasting" | "Pre-meal" | "Post-meal" | "Bedtime" | "Overnight";
  notes?: string;
  timestamp: string;
};

export type InsulinSite =
  | "Abdomen"
  | "Left thigh"
  | "Right thigh"
  | "Left arm"
  | "Right arm"
  | "Buttock";

export type InsulinEntry = {
  id: string;
  type: "NPH" | "Lispro";
  units: number;
  site: InsulinSite;
  notes?: string;
  timestamp: string;
};

const KEYS = {
  profile: "insulina:profile",
  glucose: "insulina:glucose",
  insulin: "insulina:insulin",
};

const isBrowser = () => typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("insulina:update"));
}

export const getProfile = (): Profile | null => read<Profile | null>(KEYS.profile, null);
export const setProfile = (p: Profile) => write(KEYS.profile, p);

export const getGlucose = (): GlucoseEntry[] => read<GlucoseEntry[]>(KEYS.glucose, []);
export const addGlucose = (e: Omit<GlucoseEntry, "id">) => {
  const list = getGlucose();
  list.unshift({ ...e, id: crypto.randomUUID() });
  write(KEYS.glucose, list);
};

export const getInsulin = (): InsulinEntry[] => read<InsulinEntry[]>(KEYS.insulin, []);
export const addInsulin = (e: Omit<InsulinEntry, "id">) => {
  const list = getInsulin();
  list.unshift({ ...e, id: crypto.randomUUID() });
  write(KEYS.insulin, list);
};

export function glucoseStatus(v: number, min = 70, max = 180): "ok" | "warn" | "danger" {
  if (v < min || v > 250) return "danger";
  if (v > max) return "warn";
  return "ok";
}
