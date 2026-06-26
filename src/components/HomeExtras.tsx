import { useEffect, useState } from "react";
import { Droplet, PartyPopper, Plus, Minus } from "lucide-react";
import {
  addGlass,
  getHydration,
  getNocturnalForToday,
  getProfile,
  getSpecialDay,
  removeGlass,
  saveNocturnal,
  setSpecialDay,
  type NocturnalSymptom,
  type SpecialDayType,
} from "@/lib/storage";

const SPECIAL_TYPES: SpecialDayType[] = [
  "Party/social event",
  "Travel",
  "High-stress day",
  "Illness",
  "Other",
];

const SYMPTOMS: NocturnalSymptom[] = ["Sweating", "Nightmares", "Headache"];

export function HomeExtras() {
  const [glasses, setGlasses] = useState(0);
  const [goal, setGoal] = useState(8);
  const [special, setSpecial] = useState(getSpecialDay());
  const [showSpecialPicker, setShowSpecialPicker] = useState(false);
  const [needNocturnal, setNeedNocturnal] = useState(false);
  const [symptoms, setSymptoms] = useState<NocturnalSymptom[]>([]);

  useEffect(() => {
    const refresh = () => {
      setGlasses(getHydration(new Date()));
      const p = getProfile();
      setGoal(p?.hydrationGoal ?? 8);
      setSpecial(getSpecialDay());
      setNeedNocturnal(!getNocturnalForToday(new Date())?.answered);
    };
    refresh();
    window.addEventListener("insulina:update", refresh);
    return () => window.removeEventListener("insulina:update", refresh);
  }, []);

  const toggleSymptom = (s: NocturnalSymptom) =>
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const submitNocturnal = () => {
    saveNocturnal(symptoms);
    setNeedNocturnal(false);
  };

  return (
    <div className="mt-6 space-y-4">
      {needNocturnal && (
        <div className="rounded-xl border border-secondary/40 bg-accent p-4">
          <p className="text-sm font-semibold text-primary">Good morning check</p>
          <p className="mt-1 text-sm text-foreground">
            Did you have any of these symptoms last night?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SYMPTOMS.map((s) => (
              <button
                key={s}
                onClick={() => toggleSymptom(s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  symptoms.includes(s)
                    ? "border-secondary bg-secondary text-secondary-foreground"
                    : "border-border bg-card"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={submitNocturnal} className="btn-primary text-sm flex-1">Save</button>
            <button
              onClick={() => { saveNocturnal([]); setNeedNocturnal(false); }}
              className="rounded-md border border-border px-3 py-2 text-sm"
            >
              None
            </button>
          </div>
        </div>
      )}

      {special.active && (
        <div className="rounded-xl border-l-4 border-l-amber-500 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">Special day mode on{special.type ? ` · ${special.type}` : ""}.</p>
          <p>The app will check in more often today.</p>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hydration</p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {glasses} <span className="text-sm font-normal text-muted-foreground">/ {goal} glasses</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label="Remove glass"
              onClick={() => removeGlass()}
              className="grid size-10 place-items-center rounded-full border border-border"
            >
              <Minus className="size-4" />
            </button>
            <button
              aria-label="Add glass"
              onClick={() => addGlass()}
              className="grid size-12 place-items-center rounded-full bg-secondary text-secondary-foreground"
            >
              <Droplet className="size-5" />
            </button>
            <button
              aria-label="Add glass plus"
              onClick={() => addGlass()}
              className="grid size-10 place-items-center rounded-full border border-border"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PartyPopper className="size-5 text-secondary" />
            <p className="text-sm font-semibold">Special day mode</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={special.active}
              onChange={(e) => {
                if (e.target.checked) {
                  setShowSpecialPicker(true);
                } else {
                  setSpecialDay({ active: false });
                }
              }}
              className="peer sr-only"
            />
            <span className="h-6 w-11 rounded-full bg-muted peer-checked:bg-secondary transition-colors" />
            <span className="absolute left-1 top-1 size-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
          </label>
        </div>

        {showSpecialPicker && !special.active && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">Pick a type:</p>
            <div className="flex flex-wrap gap-2">
              {SPECIAL_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setSpecialDay({ active: true, type: t, startedAt: new Date().toISOString() });
                    setShowSpecialPicker(false);
                  }}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
