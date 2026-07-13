import {
  getGlucose,
  getInsulin,
  type GlucoseEntry,
  type InsulinEntry,
  type InsulinSite,
} from "./storage";

export type Period = "week" | "2weeks" | "month";

export const periodDays: Record<Period, number> = {
  week: 7,
  "2weeks": 14,
  month: 30,
};

export const periodLabel: Record<Period, string> = {
  week: "Week",
  "2weeks": "2 Weeks",
  month: "Month",
};

export function periodStart(period: Period, now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (periodDays[period] - 1));
  return d;
}

export function filterByPeriod<T extends { timestamp: string }>(
  list: T[],
  period: Period,
  now = new Date(),
): T[] {
  const start = periodStart(period, now).getTime();
  return list.filter((e) => new Date(e.timestamp).getTime() >= start);
}

const avg = (arr: number[]) =>
  arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

export type GlucoseStats = {
  count: number;
  overallAvg: number;
  fastingAvg: number;
  postMealAvg: number;
  inRange: number;
  inRangePct: number;
  below: number;
  belowPct: number;
  above: number;
  abovePct: number;
};

export function glucoseStats(
  entries: GlucoseEntry[],
  rangeMin = 70,
  rangeMax = 180,
): GlucoseStats {
  const values = entries.map((e) => e.value);
  const fasting = entries.filter((e) => e.moment === "Fasting").map((e) => e.value);
  const post = entries.filter((e) => e.moment === "Post-meal").map((e) => e.value);
  const inRange = values.filter((v) => v >= rangeMin && v <= rangeMax).length;
  const below = values.filter((v) => v < rangeMin).length;
  const above = values.filter((v) => v > rangeMax).length;
  const n = values.length || 1;
  return {
    count: values.length,
    overallAvg: avg(values),
    fastingAvg: avg(fasting),
    postMealAvg: avg(post),
    inRange,
    inRangePct: (inRange / n) * 100,
    below,
    belowPct: (below / n) * 100,
    above,
    abovePct: (above / n) * 100,
  };
}

export function avgDailyInsulin(
  entries: InsulinEntry[],
  period: Period,
): { nph: number; lispro: number } {
  const days = periodDays[period];
  const nph = entries.filter((e) => e.type === "NPH").reduce((s, e) => s + e.units, 0);
  const lispro = entries.filter((e) => e.type === "Lispro").reduce((s, e) => s + e.units, 0);
  return { nph: nph / days, lispro: lispro / days };
}

export function highFastingStreak(
  entries: GlucoseEntry[],
  threshold = 150,
  minStreak = 3,
): { hasStreak: boolean; days: string[] } {
  const fasting = entries.filter((e) => e.moment === "Fasting");
  const byDay = new Map<string, number[]>();
  for (const e of fasting) {
    const d = new Date(e.timestamp);
    d.setHours(0, 0, 0, 0);
    const k = d.toISOString().slice(0, 10);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(e.value);
  }
  const days = [...byDay.keys()].sort();
  let streak: string[] = [];
  let best: string[] = [];
  for (let i = 0; i < days.length; i++) {
    const k = days[i];
    const dayAvg = avg(byDay.get(k)!);
    const isHigh = dayAvg > threshold;
    const isConsecutive =
      streak.length === 0 ||
      new Date(k).getTime() - new Date(streak[streak.length - 1]).getTime() === 86_400_000;
    if (isHigh && isConsecutive) {
      streak.push(k);
    } else {
      if (streak.length > best.length) best = streak;
      streak = isHigh ? [k] : [];
    }
  }
  if (streak.length > best.length) best = streak;
  return { hasStreak: best.length >= minStreak, days: best };
}

export function nocturnalHypoglycemia(entries: GlucoseEntry[]): string[] {
  const hits: string[] = [];
  for (const e of entries) {
    if (e.value >= 70) continue;
    const h = new Date(e.timestamp).getHours();
    if (h >= 22 || h < 7) hits.push(e.timestamp);
  }
  return hits;
}

export const SITES: InsulinSite[] = [
  "Abdomen",
  "Left thigh",
  "Right thigh",
  "Left arm",
  "Right arm",
  "Buttock",
];

export function siteUsage(entries: InsulinEntry[]): Record<InsulinSite, number> {
  const counts = Object.fromEntries(SITES.map((s) => [s, 0])) as Record<InsulinSite, number>;
  for (const e of entries) counts[e.site] = (counts[e.site] ?? 0) + 1;
  return counts;
}

export function mostUsedSite(entries: InsulinEntry[]): InsulinSite | null {
  const u = siteUsage(entries);
  let best: InsulinSite | null = null;
  let max = 0;
  for (const s of SITES) {
    if (u[s] > max) {
      max = u[s];
      best = s;
    }
  }
  return max >= 3 ? best : null;
}

export function loadStatsData(period: Period) {
  return {
    glucose: filterByPeriod(getGlucose(), period),
    insulin: filterByPeriod(getInsulin(), period),
  };
}

export type NphSuggestion = {
  direction: "increase" | "decrease" | "stable";
  units: number;
  reason: string;
  daysAnalyzed: number;
  averageFasting: number;
};

export function analyzeNphPattern(
  targetMin = 70,
  targetMax = 130,
): NphSuggestion | null {
  const glucose = getGlucose();
  const sevenDaysAgo = Date.now() - 7 * 86_400_000;
  const fasting = glucose.filter(
    (g) =>
      g.moment === "Fasting" &&
      new Date(g.timestamp).getTime() >= sevenDaysAgo,
  );
  if (fasting.length < 3) return null;
  const avgVal = fasting.reduce((s, g) => s + g.value, 0) / fasting.length;
  const daysAnalyzed = fasting.length;
  const avgRound = Math.round(avgVal);
  if (avgVal > targetMax + 20) {
    return {
      direction: "increase",
      units: avgVal > targetMax + 50 ? 2 : 1,
      reason: `Your average fasting glucose this week is ${avgRound} mg/dL — above target.`,
      daysAnalyzed,
      averageFasting: avgRound,
    };
  }
  if (avgVal < targetMin - 10) {
    return {
      direction: "decrease",
      units: 1,
      reason: `Your average fasting glucose this week is ${avgRound} mg/dL — below target.`,
      daysAnalyzed,
      averageFasting: avgRound,
    };
  }
  return {
    direction: "stable",
    units: 0,
    reason: `Your fasting glucose average is ${avgRound} mg/dL — within target range.`,
    daysAnalyzed,
    averageFasting: avgRound,
  };
}
