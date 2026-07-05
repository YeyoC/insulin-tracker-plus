import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Globe, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { searchFoods, CATEGORIES, PRELOADED_FOODS, type FoodResult } from "@/lib/foods";
import {
  addMeal,
  carbsFor,
  getFrequentFoods,
  trackFoodUsage,
  totalCarbs,
  type MealFood,
} from "@/lib/storage";
import { t, useLang } from "@/lib/i18n";
import { useProfile } from "@/hooks/useProfile";
import { calculateDose } from "@/lib/dose";

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
  useLang();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [time, setTime] = useState(nowLocalInput());
  const [notes, setNotes] = useState("");
  const [foods, setFoods] = useState<MealFood[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [sheetGlucose, setSheetGlucose] = useState<number | "">("");
  

  const total = useMemo(() => totalCarbs(foods), [foods]);
  const icr = profile?.icr ?? 15;
  const baseDose = total / icr;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (foods.length === 0) return;
    addMeal({
      foods,
      notes: notes.trim() || undefined,
      timestamp: new Date(time).toISOString(),
    });
    trackFoodUsage(foods);
    setShowSheet(true);
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-primary">{t("newMeal.title")}</h1>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{t("newMeal.mealTime")}</span>
          <input
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="input"
          />
        </label>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">{t("newMeal.foods")}</span>
          </div>


          {foods.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              {t("newMeal.empty")}
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
                        {t("newMeal.carbsPer100", { n: f.carbsPer100g })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFoods((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={t("common.delete")}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <label className="flex flex-1 items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t("newMeal.grams")}</span>
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
              <span className="text-sm opacity-90">{t("newMeal.totalCarbs")}</span>
              <span className="text-3xl font-bold">
                {Math.round(total)}
                <span className="ml-1 text-base font-normal opacity-90">g</span>
              </span>
            </div>
          </div>
        )}

        {foods.length > 0 && foods.some((f) => f.grams > 0) && (
          <div className="rounded-xl bg-primary p-4 text-primary-foreground">
            <h3 className="mb-3 text-sm font-semibold">
              {t("newMeal.estPerFoodTitle")}
            </h3>
            <div className="space-y-2">
              {foods.map((f, idx) => {
                const foodCarbs = carbsFor(f);
                const proportionalUnits =
                  total > 0 ? (foodCarbs / total) * baseDose : 0;
                return (
                  <div key={idx} className="text-sm">
                    <div>
                      {f.name} · {f.grams}g
                    </div>
                    <div className="opacity-90">
                      {Math.round(foodCarbs)}g CHO → ~
                      {proportionalUnits.toFixed(1)}U
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="my-2 border-t border-primary-foreground/30" />
            <div className="space-y-1 text-sm font-bold">
              <div className="flex justify-between">
                <span>{t("newMeal.totalCho")}</span>
                <span>{Math.round(total)}g</span>
              </div>
              <div className="flex justify-between">
                <span>{t("newMeal.lisproBase")}</span>
                <span>~{baseDose.toFixed(1)}U</span>
              </div>
            </div>
            <p className="mt-2 text-xs italic opacity-80">
              {t("newMeal.correctionNote")}
            </p>
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{t("common.notes")}</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="input"
            placeholder={t("newMeal.notesPh")}
          />
        </label>

        <button
          type="submit"
          disabled={foods.length === 0}
          className="btn-primary w-full disabled:opacity-50"
        >
          {t("newMeal.save")}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="mt-4 w-full rounded-xl border-2 border-dashed border-secondary py-4 text-sm font-semibold text-secondary hover:bg-accent"
      >
        + {t("newMeal.addFood")}
      </button>

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

      {showSheet && profile && (
        <div
          className="fixed inset-0 z-[9999] flex items-end bg-black/60 sm:items-center sm:justify-center"
          onPointerDown={(e) => { if (e.target === e.currentTarget) navigate({ to: "/meals" }); }}
        >
          <div
            className="flex w-full max-w-md flex-col rounded-t-2xl sm:rounded-2xl"
            style={{ maxHeight: "90vh", backgroundColor: "#f5f8ff", color: "#1e293b" }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-lg font-semibold">Resumen y dosis Lispro</h2>
              <button onClick={() => navigate({ to: "/meals" })} className="text-muted-foreground" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                {foods.map((f, idx) => {
                  const fc = (f.carbsPer100g * f.grams) / 100;
                  const prop = total > 0 ? (fc / total) * baseDose : 0;
                  return (
                    <div key={idx} className="flex items-baseline justify-between text-sm">
                      <span>{f.name} · {f.grams}g</span>
                      <span className="text-muted-foreground">
                        {Math.round(fc)}g CHO → ~{prop.toFixed(1)}U
                      </span>
                    </div>
                  );
                })}
                <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-semibold">
                  <span>Total CHO</span>
                  <span>{Math.round(total)}g</span>
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Glucosa actual (opcional)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={sheetGlucose}
                  onChange={(e) => setSheetGlucose(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="mg/dL"
                  className="input"
                />
              </label>

              {(() => {
                const bd = calculateDose({
                  profile,
                  mealCarbs: total,
                  currentGlucose: typeof sheetGlucose === "number" ? sheetGlucose : undefined,
                  mealTime: new Date(time),
                });
                return (
                  <div className="rounded-xl bg-primary p-4 text-primary-foreground space-y-3">
                    <p className="text-xs uppercase tracking-wide opacity-90">
                      Dosis Lispro recomendada
                    </p>
                    <p className="text-4xl font-bold">
                      {bd.totalDose}
                      <span className="ml-1 text-base font-normal opacity-90">U</span>
                    </p>
                    <div className="space-y-1 text-sm opacity-95">
                      <p>Por carbos: {bd.carbDose.toFixed(1)}U</p>
                      {bd.correctionDose > 0 && (
                        <p>Corrección: +{bd.correctionDose.toFixed(1)}U</p>
                      )}
                      {bd.adjustments.map((a, i) => (
                        <p key={i}>• {t(a.reasonKey, a.reasonParams)}</p>
                      ))}
                    </div>
                    <p className="text-xs italic opacity-80">
                      Solo es una sugerencia. Confirma con tu médico.
                    </p>
                    <div className="space-y-2 pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          navigate({
                            to: "/insulin",
                            search: {
                              type: "Lispro",
                              units: bd.totalDose,
                              mealCarbs: Math.round(total),
                              fromMeal: true,
                            },
                          } as never)
                        }
                        className="w-full rounded-xl bg-primary-foreground px-4 py-3 text-sm font-semibold text-primary"
                      >
                        Registrar esta dosis Lispro
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate({ to: "/meals" })}
                        className="w-full rounded-xl border border-primary-foreground/30 px-4 py-3 text-sm font-medium"
                      >
                        Omitir por ahora
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
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
  const [selected, setSelected] = useState<FoodResult | null>(null);
  const [grams, setGrams] = useState<number | "">(100);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualCarbs, setManualCarbs] = useState<number | "">("");
  const [openCats, setOpenCats] = useState<Record<string, boolean>>(() => ({
    [CATEGORIES[0]]: true,
  }));
  const frequent = useMemo(() => getFrequentFoods(10), []);

  const [results, setResults] = useState<FoodResult[]>(PRELOADED_FOODS);
  const [loading, setLoading] = useState(false);
  const isSearching = query.trim().length > 0;

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(PRELOADED_FOODS);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      const r = await searchFoods(query);
      setResults(r);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
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
      category: "Extras",
    });
    setManualOpen(false);
  };

  const pickByName = (name: string) => {
    const f = PRELOADED_FOODS.find((p) => p.name === name);
    if (f) setSelected(f);
  };

  const cardBg = { backgroundColor: "#ffffff", border: "1px solid #e2e8f0" };
  const accentBg = { backgroundColor: "#e8f0fb" };
  void cardBg; void accentBg;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 top-0 z-[9999] flex items-end bg-black/60 sm:items-center sm:justify-center"
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex w-full max-w-md flex-col rounded-t-2xl sm:rounded-2xl"
        style={{ height: "85vh", maxHeight: "680px", backgroundColor: "#f5f8ff", color: "#1e293b" }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3" style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f5f8ff" }}>
          <h2 className="text-lg font-semibold">{t("newMeal.addFood")}</h2>
          <button onClick={onClose} aria-label={t("common.close")} className="text-muted-foreground">
            <X className="size-5" />
          </button>
        </div>

        {selected ? (
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="font-semibold">{selected.name}</p>
              <p className="text-sm text-muted-foreground">
                {t("newMeal.carbsPer100", { n: selected.carbsPer100g })}
              </p>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">{t("newMeal.gramsConsumed")}</span>
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
              <span className="text-sm">{t("newMeal.estCarbs")} </span>
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
                {t("common.back")}
              </button>
              <button onClick={confirm} className="btn-primary flex-1">
                {t("newMeal.addToMeal")}
              </button>
            </div>
          </div>
        ) : manualOpen ? (
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">{t("newMeal.foodName")}</span>
              <input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="input"
                autoFocus
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                {t("newMeal.carbsPer100Label")}
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
                {t("common.cancel")}
              </button>
              <button onClick={addManual} className="btn-primary flex-1">
                {t("common.continue")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-border p-3" style={{ borderBottom: "1px solid #e2e8f0" }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("newMeal.searchPh")}
                  className="input pl-9 pr-9"
                />
                {loading && (
                  <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {!isSearching && frequent.length > 0 && (
                <section className="mb-4">
                  <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("newMeal.frequent")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {frequent.map((f) => (
                      <button
                        key={f.name}
                        onClick={() => pickByName(f.name)}
                        className="rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent"
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {isSearching ? (
                <>
                  {results.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      {t("newMeal.noResults")}
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
                            <p className="flex items-center gap-1.5 truncate font-medium">
                              {r.source === "off" && (
                                <Globe className="size-3.5 shrink-0 text-muted-foreground" />
                              )}
                              <span className="truncate">{r.name}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("newMeal.carbsPer100", { n: r.carbsPer100g })} · {r.category}
                            </p>
                          </div>
                          <Plus className="size-4 text-primary" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="space-y-2">
                  {CATEGORIES.map((cat) => {
                    const open = !!openCats[cat];
                    const items = PRELOADED_FOODS.filter((f) => f.category === cat);
                    return (
                      <div key={cat} className="rounded-lg border border-border">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenCats((s) => ({ ...s, [cat]: !s[cat] }))
                          }
                          className="flex w-full items-center justify-between px-3 py-2.5 text-left font-medium hover:bg-accent"
                        >
                          <span>
                            {cat}{" "}
                            <span className="text-xs font-normal text-muted-foreground">
                              ({items.length})
                            </span>
                          </span>
                          <ChevronDown
                            className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                          />
                        </button>
                        {open && (
                          <ul className="border-t border-border">
                            {items.map((r, idx) => (
                              <li key={`${r.name}-${idx}`}>
                                <button
                                  onClick={() => setSelected(r)}
                                  className="flex w-full items-center justify-between p-3 text-left hover:bg-accent"
                                >
                                  <div className="min-w-0 flex-1 pr-3">
                                    <p className="truncate font-medium">{r.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {t("newMeal.carbsPer100", { n: r.carbsPer100g })}
                                    </p>
                                  </div>
                                  <Plus className="size-4 text-primary" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => setManualOpen(true)}
                className="mt-4 w-full rounded-lg border border-dashed border-border p-3 text-sm font-medium text-primary hover:bg-accent"
              >
                {t("newMeal.addManual")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
