// Cloud sync layer: mirrors localStorage data into the cloud backend.
// The app keeps reading/writing localStorage synchronously (offline-first);
// this module pushes every change up and pulls remote data on login.
import { supabase } from "@/integrations/supabase/client";
import type {
  ExerciseEntry,
  GlucoseEntry,
  InsulinEntry,
  MealEntry,
  Profile,
} from "./storage";
import type { AlertRecord } from "./alerts";

export type SyncStatus = "local" | "syncing" | "synced" | "offline";

const K = {
  profile: "insulina:profile",
  glucose: "insulina:glucose",
  insulin: "insulina:insulin",
  meals: "insulina:meals",
  exercise: "insulina:exercise",
  alerts: "insulina:alerts",
};

const isBrowser = () => typeof window !== "undefined";

/* ---------------- status store ---------------- */
let status: SyncStatus = "local";
const listeners = new Set<(s: SyncStatus) => void>();

export const getSyncStatus = () => status;
export function subscribeSync(cb: (s: SyncStatus) => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function setStatus(s: SyncStatus) {
  if (status === s) return;
  status = s;
  listeners.forEach((cb) => cb(s));
}

/* ---------------- local helpers ---------------- */
function readLocal<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

let suppress = false;
function writeLocal(key: string, value: unknown) {
  if (!isBrowser()) return;
  suppress = true;
  window.localStorage.setItem(key, JSON.stringify(value));
  suppress = false;
}

/* ---------------- row mappers ---------------- */
type Row = Record<string, unknown>;

const profileToRow = (p: Profile, user_id: string): Row => {
  const {
    name,
    wakeTime,
    target,
    rangeMin,
    rangeMax,
    icr,
    isf,
    hydrationGoal,
    emergencyContact,
    inventory,
    ...extra
  } = p;
  return {
    user_id,
    name: name ?? "",
    wake_time: wakeTime ?? null,
    target: target ?? null,
    range_min: rangeMin ?? null,
    range_max: rangeMax ?? null,
    icr: icr ?? null,
    isf: isf ?? null,
    hydration_goal: hydrationGoal ?? null,
    emergency_contact: emergencyContact ?? null,
    inventory: inventory ?? null,
    extra,
    updated_at: new Date().toISOString(),
  };
};

const rowToProfile = (r: Row): Profile => ({
  ...((r["extra"] as object) ?? {}),
  name: (r["name"] as string) ?? "",
  wakeTime: (r["wake_time"] as string) ?? "07:00",
  target: Number(r["target"] ?? 100),
  rangeMin: Number(r["range_min"] ?? 70),
  rangeMax: Number(r["range_max"] ?? 180),
  icr: Number(r["icr"] ?? 15),
  isf: Number(r["isf"] ?? 50),
  ...(r["hydration_goal"] != null ? { hydrationGoal: Number(r["hydration_goal"]) } : {}),
  ...(r["emergency_contact"] ? { emergencyContact: r["emergency_contact"] as Profile["emergencyContact"] } : {}),
  ...(r["inventory"] ? { inventory: r["inventory"] as Profile["inventory"] } : {}),
});

const glucoseToRow = (e: GlucoseEntry, user_id: string): Row => ({
  id: e.id,
  user_id,
  value: e.value,
  moment: e.moment,
  notes: e.notes ?? null,
  occurred_at: e.timestamp,
  updated_at: new Date().toISOString(),
});
const rowToGlucose = (r: Row): GlucoseEntry => ({
  id: r["id"] as string,
  value: Number(r["value"]),
  moment: r["moment"] as GlucoseEntry["moment"],
  ...(r["notes"] ? { notes: r["notes"] as string } : {}),
  timestamp: new Date(r["occurred_at"] as string).toISOString(),
});

const insulinToRow = (e: InsulinEntry, user_id: string): Row => ({
  id: e.id,
  user_id,
  type: e.type,
  units: e.units,
  site: e.site ?? null,
  notes: e.notes ?? null,
  recommended: e.recommended ?? null,
  diff_reason: e.diffReason ?? null,
  occurred_at: e.timestamp,
  updated_at: new Date().toISOString(),
});
const rowToInsulin = (r: Row): InsulinEntry => ({
  id: r["id"] as string,
  type: r["type"] as string,
  units: Number(r["units"]),
  site: r["site"] as InsulinEntry["site"],
  ...(r["notes"] ? { notes: r["notes"] as string } : {}),
  ...(r["recommended"] != null ? { recommended: Number(r["recommended"]) } : {}),
  ...(r["diff_reason"] ? { diffReason: r["diff_reason"] as string } : {}),
  timestamp: new Date(r["occurred_at"] as string).toISOString(),
});

const mealToRow = (e: MealEntry, user_id: string): Row => ({
  id: e.id,
  user_id,
  foods: e.foods ?? [],
  notes: e.notes ?? null,
  occurred_at: e.timestamp,
  updated_at: new Date().toISOString(),
});
const rowToMeal = (r: Row): MealEntry => ({
  id: r["id"] as string,
  foods: (r["foods"] as MealEntry["foods"]) ?? [],
  ...(r["notes"] ? { notes: r["notes"] as string } : {}),
  timestamp: new Date(r["occurred_at"] as string).toISOString(),
});

const exerciseToRow = (e: ExerciseEntry, user_id: string): Row => ({
  id: e.id,
  user_id,
  type: e.type,
  duration_min: e.durationMin,
  intensity: e.intensity,
  context: e.context,
  notes: e.notes ?? null,
  occurred_at: e.timestamp,
  updated_at: new Date().toISOString(),
});
const rowToExercise = (r: Row): ExerciseEntry => ({
  id: r["id"] as string,
  type: r["type"] as ExerciseEntry["type"],
  durationMin: Number(r["duration_min"]),
  intensity: r["intensity"] as ExerciseEntry["intensity"],
  context: r["context"] as ExerciseEntry["context"],
  ...(r["notes"] ? { notes: r["notes"] as string } : {}),
  timestamp: new Date(r["occurred_at"] as string).toISOString(),
});

const alertToRow = (a: AlertRecord, user_id: string): Row => ({
  id: a.id,
  user_id,
  key: a.key,
  level: a.level,
  message_key: a.messageKey,
  message_params: a.messageParams ?? null,
  fired_at: a.firedAt,
  response: a.response ?? null,
  responded_at: a.respondedAt ?? null,
  resent: a.resent ?? null,
  resent_at: a.resentAt ?? null,
  updated_at: new Date().toISOString(),
});
const rowToAlert = (r: Row): AlertRecord => ({
  id: r["id"] as string,
  key: r["key"] as string,
  level: r["level"] as AlertRecord["level"],
  messageKey: r["message_key"] as string,
  ...(r["message_params"] ? { messageParams: r["message_params"] as AlertRecord["messageParams"] } : {}),
  firedAt: new Date(r["fired_at"] as string).toISOString(),
  ...(r["response"] ? { response: r["response"] as AlertRecord["response"] } : {}),
  ...(r["responded_at"] ? { respondedAt: new Date(r["responded_at"] as string).toISOString() } : {}),
  ...(r["resent"] ? { resent: true } : {}),
  ...(r["resent_at"] ? { resentAt: new Date(r["resent_at"] as string).toISOString() } : {}),
});

type Collection = {
  table: string;
  key: string;
  toRow: (e: never, uid: string) => Row;
  fromRow: (r: Row) => { id: string };
};

const COLLECTIONS: Collection[] = [
  { table: "glucose_entries", key: K.glucose, toRow: glucoseToRow as never, fromRow: rowToGlucose },
  { table: "insulin_entries", key: K.insulin, toRow: insulinToRow as never, fromRow: rowToInsulin },
  { table: "meal_entries", key: K.meals, toRow: mealToRow as never, fromRow: rowToMeal },
  { table: "exercise_entries", key: K.exercise, toRow: exerciseToRow as never, fromRow: rowToExercise },
  { table: "alerts", key: K.alerts, toRow: alertToRow as never, fromRow: rowToAlert },
];

const sortByTime = (list: { timestamp?: string; firedAt?: string }[]) =>
  [...list].sort(
    (a, b) =>
      new Date(b.timestamp ?? b.firedAt ?? 0).getTime() -
      new Date(a.timestamp ?? a.firedAt ?? 0).getTime(),
  );

/* ---------------- sync engine ---------------- */
let userId: string | null = null;
let firstSyncDone = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let dirty = false;
let running = false;

export const isSignedIn = () => userId != null;

function notifyLocalUpdate() {
  if (isBrowser()) window.dispatchEvent(new Event("insulina:update"));
}

/** Download remote data, merge with local (local wins on id conflicts), then push. */
async function fullSync() {
  if (!userId) return;
  setStatus("syncing");
  try {
    const uid = userId;
    const remoteProfile = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();
    if (remoteProfile.error) throw remoteProfile.error;

    const localProfile = readLocal<Profile | null>(K.profile, null);
    if (!localProfile && remoteProfile.data) {
      writeLocal(K.profile, rowToProfile(remoteProfile.data as Row));
    }

    for (const c of COLLECTIONS) {
      const res = await supabase.from(c.table as never).select("*").eq("user_id", uid);
      if (res.error) throw res.error;
      const remote = ((res.data ?? []) as Row[]).map(c.fromRow);
      const local = readLocal<{ id: string }[]>(c.key, []);
      const byId = new Map<string, { id: string }>();
      for (const r of remote) byId.set(r.id, r);
      for (const l of local) byId.set(l.id, l); // local wins
      writeLocal(c.key, sortByTime([...byId.values()] as never));
    }

    notifyLocalUpdate();
    firstSyncDone = true;
    await push();
  } catch (err) {
    console.error("[sync] full sync failed", err);
    setStatus(navigator.onLine ? "local" : "offline");
    dirty = true;
  }
}

/** Upload the current local snapshot; removes remote rows deleted locally. */
async function push() {
  if (!userId || running) return;
  if (!firstSyncDone) return;
  running = true;
  dirty = false;
  setStatus("syncing");
  const uid = userId;
  try {
    const profile = readLocal<Profile | null>(K.profile, null);
    if (profile) {
      const { error } = await supabase
        .from("profiles")
        .upsert(profileToRow(profile, uid) as never, { onConflict: "user_id" });
      if (error) throw error;
    }

    for (const c of COLLECTIONS) {
      const local = readLocal<{ id: string }[]>(c.key, []);
      if (local.length > 0) {
        const rows = local.map((e) => c.toRow(e as never, uid));
        const { error } = await supabase.from(c.table as never).upsert(rows as never);
        if (error) throw error;
      }
      const ids = local.map((e) => e.id);
      const del = supabase.from(c.table as never).delete().eq("user_id", uid);
      const { error: delErr } = await (ids.length
        ? del.not("id", "in", `(${ids.map((i) => `"${i}"`).join(",")})`)
        : del);
      if (delErr) throw delErr;
    }
    setStatus("synced");
  } catch (err) {
    console.error("[sync] push failed", err);
    dirty = true;
    setStatus(isBrowser() && !navigator.onLine ? "offline" : "local");
  } finally {
    running = false;
    if (dirty && isBrowser() && navigator.onLine) schedulePush();
  }
}

function schedulePush() {
  if (!userId) return;
  dirty = true;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void push();
  }, 1200);
}

export function retrySync() {
  if (!userId) return;
  if (!firstSyncDone) void fullSync();
  else void push();
}

let initialized = false;

/** Wire up auth listening + change tracking. Call once, client-side. */
export function initSync() {
  if (!isBrowser() || initialized) return;
  initialized = true;

  const applyUser = (id: string | null) => {
    if (id === userId) return;
    userId = id;
    firstSyncDone = false;
    if (id) void fullSync();
    else setStatus("local");
  };

  void supabase.auth.getSession().then(({ data }) => {
    applyUser(data.session?.user.id ?? null);
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "TOKEN_REFRESHED") return;
    applyUser(session?.user.id ?? null);
  });

  window.addEventListener("insulina:update", () => {
    if (suppress) return;
    schedulePush();
  });

  window.addEventListener("online", () => {
    if (userId) retrySync();
  });
  window.addEventListener("offline", () => setStatus("offline"));
}

/** Clear the locally cached data (used on sign out). */
export function clearLocalData() {
  if (!isBrowser()) return;
  suppress = true;
  Object.values(K).forEach((k) => window.localStorage.removeItem(k));
  suppress = false;
  notifyLocalUpdate();
}
