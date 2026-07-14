// Insulin action profiles — full catalog, single source of truth
import type { InsulinEntry } from "./storage";

export type InsulinProfile = {
  onsetMin: number;
  peakStartMin: number;
  peakEndMin: number;
  durationMin: number;
  label: string;
  color: string;
  category: "ultra-rapid" | "rapid" | "intermediate" | "long" | "ultra-long";
  brandNames?: string[];
};

export const PROFILES: Record<string, InsulinProfile> = {
  // Ultra-rapid
  Lispro: {
    onsetMin: 15, peakStartMin: 30, peakEndMin: 90, durationMin: 240,
    label: "Lispro", color: "#1A6B9A",
    category: "ultra-rapid", brandNames: ["Humalog", "Admelog"],
  },
  Aspart: {
    onsetMin: 10, peakStartMin: 30, peakEndMin: 90, durationMin: 240,
    label: "Aspart", color: "#2E75B6",
    category: "ultra-rapid", brandNames: ["NovoRapid", "NovoLog", "Fiasp"],
  },
  Glulisina: {
    onsetMin: 10, peakStartMin: 30, peakEndMin: 60, durationMin: 180,
    label: "Glulisina", color: "#4A90D9",
    category: "ultra-rapid", brandNames: ["Apidra"],
  },
  // Short-acting
  Regular: {
    onsetMin: 30, peakStartMin: 90, peakEndMin: 180, durationMin: 360,
    label: "Regular", color: "#5B9BD5",
    category: "rapid", brandNames: ["Humulin R", "Novolin R"],
  },
  // Intermediate
  NPH: {
    onsetMin: 60, peakStartMin: 240, peakEndMin: 480, durationMin: 900,
    label: "NPH", color: "#1A3A5C",
    category: "intermediate", brandNames: ["Humulin N", "Novolin N", "Insulatard"],
  },
  // Long-acting
  Glargina: {
    onsetMin: 60, peakStartMin: 360, peakEndMin: 720, durationMin: 1440,
    label: "Glargina", color: "#404040",
    category: "long", brandNames: ["Lantus", "Basaglar", "Toujeo"],
  },
  Detemir: {
    onsetMin: 60, peakStartMin: 360, peakEndMin: 600, durationMin: 1080,
    label: "Detemir", color: "#595959",
    category: "long", brandNames: ["Levemir"],
  },
  // Ultra-long
  Degludec: {
    onsetMin: 30, peakStartMin: 600, peakEndMin: 1440, durationMin: 2160,
    label: "Degludec", color: "#737373",
    category: "ultra-long", brandNames: ["Tresiba"],
  },
};

// Grouped list for UI display
export const INSULIN_CATALOG = [
  {
    category: "Acción ultra-rápida / rápida",
    types: ["Lispro", "Aspart", "Glulisina", "Regular"],
  },
  {
    category: "Acción intermedia",
    types: ["NPH"],
  },
  {
    category: "Acción prolongada / ultra-prolongada",
    types: ["Glargina", "Detemir", "Degludec"],
  },
] as const;

export const USUAL_TYPES = ["NPH", "Lispro", "Aspart"];

export type InsulinWindow = {
  entry: InsulinEntry;
  profile: InsulinProfile;
  onset: Date;
  peakStart: Date;
  peakEnd: Date;
  end: Date;
};

export function windowFor(entry: InsulinEntry): InsulinWindow {
  const profile = PROFILES[entry.type] ?? PROFILES["NPH"];
  const t0 = new Date(entry.timestamp).getTime();
  return {
    entry,
    profile,
    onset:     new Date(t0 + profile.onsetMin     * 60_000),
    peakStart: new Date(t0 + profile.peakStartMin * 60_000),
    peakEnd:   new Date(t0 + profile.peakEndMin   * 60_000),
    end:       new Date(t0 + profile.durationMin  * 60_000),
  };
}

/** 0..1 fraction of active insulin at time `now`. Piecewise linear. */
export function activityAt(w: InsulinWindow, now: Date): number {
  const t  = now.getTime();
  const t0 = new Date(w.entry.timestamp).getTime();
  if (t <= t0 || t >= w.end.getTime()) return 0;
  if (t < w.onset.getTime()) {
    return 0.3 * (t - t0) / (w.onset.getTime() - t0);
  }
  if (t < w.peakStart.getTime()) {
    return 0.3 + 0.7 * (t - w.onset.getTime()) / (w.peakStart.getTime() - w.onset.getTime());
  }
  if (t <= w.peakEnd.getTime()) return 1;
  return Math.max(0, 1 - (t - w.peakEnd.getTime()) / (w.end.getTime() - w.peakEnd.getTime()));
}

export function isActive(w: InsulinWindow, now: Date): boolean {
  const t = now.getTime();
  return t >= new Date(w.entry.timestamp).getTime() && t < w.end.getTime();
}

export function activeWindows(entries: InsulinEntry[], now: Date): InsulinWindow[] {
  return entries.map(windowFor).filter((w) => isActive(w, now));
}

export function formatTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
