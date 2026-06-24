import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { searchFoods, type FoodResult } from "@/lib/foods";
import {
  addMeal,
  carbsFor,
  getFrequentFoods,
  trackFoodUsage,
  totalCarbs,
  type MealFood,
} from "@/lib/storage";

export const Route = createFileRoute("/meals/new")({
  head: () => ({ meta: [{ title: "New meal — InsulinaApp" }] }),
  component: NewMealPage,
});

function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function NewMealPage() {
  const navigate = useNavigate();
  const [time, setTime] = useState(nowLocalInput());
  const [notes, setNotes] = useState("");
  const [foods, setFoods] = useState<MealFood[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const total = useMemo(() => totalCarbs(foods), [foods]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (foods.length === 0) return;
    addMeal({
      foods,
      notes: notes.trim() || undefined,
      timestamp: new Date(time).toISOString(),
    });
    trackFoodUsage(foods);
    navigate({ to: "/meals" });
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-primary">New meal</h1>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Meal time</span>
          <input
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="input"
          />
        </label>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Foods</span>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground"
            >
              <Plus className="size-4" /> Add food
            </button>
          </div>

          {foods.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              No foods yet — tap "Add food" to begin.
            </p>
          ) : (
            <ul className="space-y-2">
              {foods.map((f, idx) => (
                <li
                  key={idx}
                  className="rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.carbsPer100g}g carbs / 100g
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFoods((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <label className="flex flex-1 items-center gap-2">
                      <span className="text-xs text-muted-foreground">Grams</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={1}
                        value={f.grams}
                        onChange={(e) => {
                          const grams = Number(e.target.value) || 0;
                          setFoods((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, grams } : p)),
                          );
                        }}
                        className="input py-1.5 text-base"
                      />
                    </label>
                    <span className="rounded-md bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground">
                      {Math.round(carbsFor(f))}g
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {foods.length > 0 && (
          <div className="rounded-xl bg-primary p-4 text-primary-foreground">
            <div className="flex items-baseline justify-between">
              <span className="text-sm opacity-90">Total carbs</span>
              <span className="text-3xl font-bold">
                {Math.round(total)}
                <span className="ml-1 text-base font-normal opacity-90">g</span>
              </span>
            </div>
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="input"
            placeholder="e.g. ate quickly, reheated rice"
          />
        </label>

        <button
          type="submit"
          disabled={foods.length === 0}
          className="btn-primary w-full disabled:opacity-50"
        >
          Save meal
        </button>
      </form>

      {pickerOpen && (
        <FoodPicker
          onClose={() => setPickerOpen(false)}
          onPick={(food, grams) => {
            setFoods((prev) => [
              ...prev,
              { name: food.name, carbsPer100g: food.carbsPer100g, grams },
            ]);
            setPickerOpen(false);
          }}
        />
      )}
    </AppShell>
  );
}

function FoodPicker({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (food: FoodResult, grams: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<FoodResult | null>(null);
  const [grams, setGrams] = useState<number | "">(100);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualCarbs, setManualCarbs] = useState<number | "">("");
  const frequent = useMemo(() => getFrequentFoods(10), []);
  const ctrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchFoods(q, ctrl.signal);
        if (!ctrl.signal.aborted) setResults(r);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const confirm = () => {
    if (!selected) return;
    const g = typeof grams === "number" ? grams : 0;
    if (g <= 0) return;
    onPick(selected, g);
  };

  const addManual = () => {
    if (!manualName.trim() || typeof manualCarbs !== "number") return;
    setSelected({
      name: manualName.trim(),
      carbsPer100g: manualCarbs,
      source: "local",
    });
    setManualOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-2xl bg-background sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">Add food</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground">
            <X className="size-5" />
          </button>
        </div>

        {selected ? (
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="font-semibold">{selected.name}</p>
              <p className="text-sm text-muted-foreground">
                {selected.carbsPer100g}g carbs / 100g
              </p>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Grams consumed</span>
              <input
                type="number"
                inputMode="decimal"
                min={1}
                value={grams}
                onChange={(e) =>
                  setGrams(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="input text-2xl font-semibold"
                autoFocus
              />
            </label>
            <div className="rounded-lg bg-accent p-3 text-center text-accent-foreground">
              <span className="text-sm">Estimated carbs: </span>
              <span className="text-xl font-bold">
                {Math.round(
                  ((typeof grams === "number" ? grams : 0) * selected.carbsPer100g) /
                    100,
                )}
                g
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelected(null)}
                className="flex-1 rounded-lg border border-border px-4 py-3 font-medium"
              >
                Back
              </button>
              <button onClick={confirm} className="btn-primary flex-1">
                Add to meal
              </button>
            </div>
          </div>
        ) : manualOpen ? (
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Food name</span>
              <input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="input"
                autoFocus
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Carbohydrates per 100g
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={manualCarbs}
                onChange={(e) =>
                  setManualCarbs(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="input"
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setManualOpen(false)}
                className="flex-1 rounded-lg border border-border px-4 py-3 font-medium"
              >
                Cancel
              </button>
              <button onClick={addManual} className="btn-primary flex-1">
                Continue
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-border p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search foods..."
                  className="input pl-9"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {!query && frequent.length > 0 && (
                <section className="mb-4">
                  <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Frequent foods
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {frequent.map((f) => (
                      <button
                        key={f.name}
                        onClick={() =>
                          setSelected({
                            name: f.name,
                            carbsPer100g: f.carbsPer100g,
                            source: "local",
                          })
                        }
                        className="rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent"
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {loading && (
                <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Searching…
                </p>
              )}

              {!loading && query && results.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </p>
              )}

              <ul className="space-y-1">
                {results.map((r, idx) => (
                  <li key={`${r.name}-${idx}`}>
                    <button
                      onClick={() => setSelected(r)}
                      className="flex w-full items-center justify-between rounded-lg p-3 text-left hover:bg-accent"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="truncate font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.carbsPer100g}g carbs / 100g
                          {r.source === "off" ? " · Open Food Facts" : ""}
                        </p>
                      </div>
                      <Plus className="size-4 text-primary" />
                    </button>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setManualOpen(true)}
                className="mt-4 w-full rounded-lg border border-dashed border-border p-3 text-sm font-medium text-primary hover:bg-accent"
              >
                + Add food manually
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
