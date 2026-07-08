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
  type: string;
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
  unit?: "g" | "ml";
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
  exercise: "insulina:exercise",
  hydration: "insulina:hydration",
  specialDay: "insulina:specialDay",
  nocturnal: "insulina:nocturnal",
  dishes: "insulina:dishes",
};

export type SavedDish = {
  id: string;
  name: string;
  foods: MealFood[];
  createdAt: string;
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

// ===== Exercise =====
export type ExerciseType =
  | "Weightlifting"
  | "Cardio"
  | "Crossfit"
  | "Walking"
  | "Swimming"
  | "Cycling"
  | "Other";
export type ExerciseIntensity = "Light" | "Moderate" | "Intense";
export type ExerciseContext = "Fasted" | "After a meal" | "With active insulin";

export type ExerciseEntry = {
  id: string;
  type: ExerciseType;
  durationMin: number;
  intensity: ExerciseIntensity;
  context: ExerciseContext;
  notes?: string;
  timestamp: string;
};

export const getExercise = (): ExerciseEntry[] =>
  read<ExerciseEntry[]>(KEYS.exercise, []);
export const addExercise = (e: Omit<ExerciseEntry, "id">) => {
  const list = getExercise();
  list.unshift({ ...e, id: crypto.randomUUID() });
  write(KEYS.exercise, list);
};
export const deleteExercise = (id: string) =>
  write(KEYS.exercise, getExercise().filter((x) => x.id !== id));

// ===== Hydration =====
const dayKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

type HydrationMap = Record<string, number>;
export const getHydration = (date: Date = new Date()): number => {
  const map = read<HydrationMap>(KEYS.hydration, {});
  return map[dayKey(date)] ?? 0;
};
export const addGlass = (date: Date = new Date()) => {
  const map = read<HydrationMap>(KEYS.hydration, {});
  const k = dayKey(date);
  map[k] = (map[k] ?? 0) + 1;
  write(KEYS.hydration, map);
};
export const removeGlass = (date: Date = new Date()) => {
  const map = read<HydrationMap>(KEYS.hydration, {});
  const k = dayKey(date);
  map[k] = Math.max(0, (map[k] ?? 0) - 1);
  write(KEYS.hydration, map);
};

// ===== Special Day =====
export type SpecialDayType =
  | "Party/social event"
  | "Travel"
  | "High-stress day"
  | "Illness"
  | "Other";
export type SpecialDayState = {
  active: boolean;
  type?: SpecialDayType;
  startedAt?: string;
};
export const getSpecialDay = (): SpecialDayState =>
  read<SpecialDayState>(KEYS.specialDay, { active: false });
export const setSpecialDay = (s: SpecialDayState) => write(KEYS.specialDay, s);

// ===== Nocturnal check =====
export type NocturnalSymptom = "Sweating" | "Nightmares" | "Headache";
type NocturnalMap = Record<string, { answered: boolean; symptoms: NocturnalSymptom[] }>;

export const getNocturnalForToday = (date: Date = new Date()) => {
  const map = read<NocturnalMap>(KEYS.nocturnal, {});
  return map[dayKey(date)];
};
export const saveNocturnal = (
  symptoms: NocturnalSymptom[],
  date: Date = new Date(),
) => {
  const map = read<NocturnalMap>(KEYS.nocturnal, {});
  map[dayKey(date)] = { answered: true, symptoms };
  write(KEYS.nocturnal, map);
};
export const getNocturnalHistory = () =>
  Object.entries(read<NocturnalMap>(KEYS.nocturnal, {}))
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

// Average daily Lispro dose for inventory estimate
export const averageDailyLispro = (days = 7): number => {
  const now = Date.now();
  const cutoff = now - days * 86_400_000;
  const recent = getInsulin().filter(
    (i) => i.type === "Lispro" && new Date(i.timestamp).getTime() >= cutoff,
  );
  if (recent.length === 0) return 0;
  const total = recent.reduce((s, i) => s + i.units, 0);
  return total / days;
};

export function pruneOldData(daysToKeep = 90) {
  const cutoff = Date.now() - daysToKeep * 86_400_000;
  const keep = <T extends { timestamp: string }>(arr: T[]) =>
    arr.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
  write(KEYS.glucose, keep(getGlucose()));
  write(KEYS.insulin, keep(getInsulin()));
  write(KEYS.meals, keep(getMeals()));
  write(KEYS.exercise, keep(getExercise()));
}

