// Insulin action profiles and active insulin calculations.
import type { InsulinEntry } from "./storage";

export type InsulinProfile = {
  onsetMin: number;
  peakStartMin: number;
  peakEndMin: number;
  durationMin: number;
  label: string;
  color: string; // tailwind/text color hex-ish
};

export const PROFILES: Record<InsulinEntry["type"], InsulinProfile> = {
  NPH: {
    onsetMin: 60,
    peakStartMin: 240,
    peakEndMin: 480,
    durationMin: 900, // 15h
    label: "NPH",
    color: "#1A3A5C",
  },
  Lispro: {
    onsetMin: 15,
    peakStartMin: 30,
    peakEndMin: 90,
    durationMin: 240, // 4h
    label: "Lispro",
    color: "#1A6B9A",
  },
};

export type InsulinWindow = {
  entry: InsulinEntry;
  profile: InsulinProfile;
  onset: Date;
  peakStart: Date;
  peakEnd: Date;
  end: Date;
};

export function windowFor(entry: InsulinEntry): InsulinWindow {
  const profile = PROFILES[entry.type as keyof typeof PROFILES] ?? PROFILES["NPH"];
  const t0 = new Date(entry.timestamp).getTime();
  return {
    entry,
    profile,
    onset: new Date(t0 + profile.onsetMin * 60_000),
    peakStart: new Date(t0 + profile.peakStartMin * 60_000),
    peakEnd: new Date(t0 + profile.peakEndMin * 60_000),
    end: new Date(t0 + profile.durationMin * 60_000),
  };
}

/** Returns 0..1 fraction of active insulin at time `now`. Piecewise linear. */
export function activityAt(w: InsulinWindow, now: Date): number {
  const t = now.getTime();
  const t0 = new Date(w.entry.timestamp).getTime();
  if (t <= t0 || t >= w.end.getTime()) return 0;
  if (t < w.onset.getTime()) {
    // ramp 0 -> 0.3 from injection to onset
    const r = (t - t0) / (w.onset.getTime() - t0);
    return 0.3 * r;
  }
  if (t < w.peakStart.getTime()) {
    // 0.3 -> 1
    const r = (t - w.onset.getTime()) / (w.peakStart.getTime() - w.onset.getTime());
    return 0.3 + 0.7 * r;
  }
  if (t <= w.peakEnd.getTime()) return 1;
  // peakEnd -> end: 1 -> 0
  const r = (t - w.peakEnd.getTime()) / (w.end.getTime() - w.peakEnd.getTime());
  return Math.max(0, 1 - r);
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
