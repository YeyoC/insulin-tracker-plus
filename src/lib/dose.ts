import type { Profile } from "./storage";
import { getInsulin } from "./storage";
import { windowFor, PROFILES } from "./insulin";

export function getLisproRatio(profile: Profile, mealTime: Date): number {
  const hour = mealTime.getHours();
  if (hour < 12 && profile.lisproRatioMorning)    return Math.max(1, profile.lisproRatioMorning);
  if (hour < 18 && profile.lisproRatioAfternoon)  return Math.max(1, profile.lisproRatioAfternoon);
  if (profile.lisproRatioNight)                   return Math.max(1, profile.lisproRatioNight);
  return Math.max(1, profile.icr || 15);
}

export type DoseAdjustment = {
  factor: number;
  reasonKey: string;
  reasonParams?: Record<string, string | number>;
};

export type DoseBreakdown = {
  carbDose: number;
  correctionDose: number;
  baseDose: number;
  adjustments: DoseAdjustment[];
  totalDose: number;
};

function minutesSinceWake(mealTime: Date, wakeTime: string): number {
  const [h, m] = wakeTime.split(":").map(Number);
  const wake = new Date(mealTime);
  wake.setHours(h || 0, m || 0, 0, 0);
  return (mealTime.getTime() - wake.getTime()) / 60_000;
}

export function calculateDose(opts: {
  profile: Profile;
  mealCarbs: number;
  currentGlucose?: number;
  mealTime?: Date;
}): DoseBreakdown {
  const { profile, mealCarbs, currentGlucose, mealTime = new Date() } = opts;
  const icr = getLisproRatio(profile, mealTime);
  const isf = Math.max(1, profile.isf || 50);

  const carbDose = mealCarbs > 0 ? mealCarbs / icr : 0;
  const correctionDose =
    typeof currentGlucose === "number" && currentGlucose > profile.target
      ? (currentGlucose - profile.target) / isf
      : 0;
  const baseDose = carbDose + correctionDose;

  const adjustments: DoseAdjustment[] = [];

  const sinceWake = minutesSinceWake(mealTime, profile.wakeTime);
  if (sinceWake >= 0 && sinceWake <= 180) {
    adjustments.push({ factor: 1.2, reasonKey: "doseAdj.dawn" });
  }

  const insulin = getInsulin();
  const now = mealTime.getTime();
  for (const e of insulin) {
    const prof = PROFILES[e.type];
    if (!prof || prof.category !== "intermediate") continue;
    const w = windowFor(e);
    const minsSince = (now - new Date(e.timestamp).getTime()) / 60_000;
    if (minsSince < 60 || now >= w.end.getTime()) continue;
    if (minsSince >= 60 && minsSince < 180) {
      adjustments.push({ factor: 0.9, reasonKey: "doseAdj.nphRising" });
      break;
    }
    if (minsSince >= 180 && minsSince < 240) {
      adjustments.push({ factor: 0.85, reasonKey: "doseAdj.nphTransition" });
      break;
    }
    if (minsSince >= 240 && minsSince <= 480) {
      adjustments.push({ factor: 0.8, reasonKey: "doseAdj.nphPeak" });
      break;
    }
  }

  const totalDose = adjustments.reduce((acc, a) => acc * a.factor, baseDose);

  return {
    carbDose,
    correctionDose,
    baseDose,
    adjustments,
    totalDose: Math.max(0, Math.round(totalDose * 2) / 2),
  };
}

export const DIFF_REASONS = [
  "Ate more than planned",
  "Doctor instruction",
  "Prior exercise",
  "Personal experience",
  "Glucose was very high",
  "Other (specify)",
] as const;
