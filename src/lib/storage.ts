// Local storage helpers — client-only

export type EmergencyContact = { name: string; phone: string };
export type Inventory = {
  units: number;
  openedDate?: string; // ISO date
  expirationDate?: string; // ISO date
};

export type Profile = {
  name: string;
  wakeTime: string;
  target: number;
  rangeMin: number;
  rangeMax: number;
  icr: number; // grams of carbs covered by 1U Lispro
  isf: number; // mg/dL drop per 1U Lispro
  hydrationGoal?: number; // glasses/day, default 8
  emergencyContact?: EmergencyContact;
  inventory?: Inventory;
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
  recommended?: number;
  diffReason?: string;
};

export type MealFood = {
  name: string;
  carbsPer100g: number;
  grams: number;
};

export type MealEntry = {
  id: string;
  foods: MealFood[];
  notes?: string;
  timestamp: string;
};

export type TimelineEvent =
  | { kind: "glucose"; id: string; timestamp: string; data: GlucoseEntry }
  | { kind: "insulin"; id: string; timestamp: string; data: InsulinEntry }
  | { kind: "meal"; id: string; timestamp: string; data: MealEntry };

const KEYS = {
  profile: "insulina:profile",
  glucose: "insulina:glucose",
  insulin: "insulina:insulin",
  meals: "insulina:meals",
  foodUsage: "insulina:foodUsage",
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

export const getProfile = (): Profile | null => {
  const p = read<Profile | null>(KEYS.profile, null);
  if (!p) return null;
  return { ...p, icr: p.icr ?? 15, isf: p.isf ?? 50 };
};
export const setProfile = (p: Profile) => write(KEYS.profile, p);

export const getGlucose = (): GlucoseEntry[] => read<GlucoseEntry[]>(KEYS.glucose, []);
export const addGlucose = (e: Omit<GlucoseEntry, "id">) => {
  const list = getGlucose();
  list.unshift({ ...e, id: crypto.randomUUID() });
  write(KEYS.glucose, list);
};
export const deleteGlucose = (id: string) =>
  write(KEYS.glucose, getGlucose().filter((g) => g.id !== id));

export const getInsulin = (): InsulinEntry[] => read<InsulinEntry[]>(KEYS.insulin, []);
export const addInsulin = (e: Omit<InsulinEntry, "id">) => {
  const list = getInsulin();
  list.unshift({ ...e, id: crypto.randomUUID() });
  write(KEYS.insulin, list);
};
export const deleteInsulin = (id: string) =>
  write(KEYS.insulin, getInsulin().filter((i) => i.id !== id));

export const getMeals = (): MealEntry[] => read<MealEntry[]>(KEYS.meals, []);
export const addMeal = (e: Omit<MealEntry, "id">) => {
  const list = getMeals();
  list.unshift({ ...e, id: crypto.randomUUID() });
  write(KEYS.meals, list);
};
export const deleteMeal = (id: string) =>
  write(KEYS.meals, getMeals().filter((m) => m.id !== id));

// Food usage tracking for frequent foods.
type FoodUsage = Record<string, { name: string; carbsPer100g: number; count: number }>;
export const getFoodUsage = (): FoodUsage => read<FoodUsage>(KEYS.foodUsage, {});
export const trackFoodUsage = (foods: MealFood[]) => {
  const usage = getFoodUsage();
  for (const f of foods) {
    const key = f.name.toLowerCase().trim();
    if (!key) continue;
    const prev = usage[key];
    usage[key] = {
      name: f.name,
      carbsPer100g: f.carbsPer100g,
      count: (prev?.count ?? 0) + 1,
    };
  }
  write(KEYS.foodUsage, usage);
};
export const getFrequentFoods = (limit = 10) =>
  Object.values(getFoodUsage())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

export function glucoseStatus(v: number, min = 70, max = 180): "ok" | "warn" | "danger" {
  if (v < min || v > 250) return "danger";
  if (v > max) return "warn";
  return "ok";
}

export function carbsFor(food: { carbsPer100g: number; grams: number }) {
  return (food.carbsPer100g * food.grams) / 100;
}

export function totalCarbs(foods: MealFood[]) {
  return foods.reduce((sum, f) => sum + carbsFor(f), 0);
}

export function getTimelineForDay(date: Date): TimelineEvent[] {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const inDay = (ts: string) => {
    const t = new Date(ts).getTime();
    return t >= start.getTime() && t < end.getTime();
  };

  const events: TimelineEvent[] = [
    ...getGlucose()
      .filter((g) => inDay(g.timestamp))
      .map((g) => ({ kind: "glucose" as const, id: g.id, timestamp: g.timestamp, data: g })),
    ...getInsulin()
      .filter((i) => inDay(i.timestamp))
      .map((i) => ({ kind: "insulin" as const, id: i.id, timestamp: i.timestamp, data: i })),
    ...getMeals()
      .filter((m) => inDay(m.timestamp))
      .map((m) => ({ kind: "meal" as const, id: m.id, timestamp: m.timestamp, data: m })),
  ];

  return events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}
