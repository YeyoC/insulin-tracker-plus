import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Utensils, ChevronDown } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SwipeRow } from "@/components/SwipeRow";
import {
  deleteMeal,
  getMeals,
  totalCarbs,
  type MealEntry,
} from "@/lib/storage";
import { t, locale, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/meals")({
  head: () => ({ meta: [{ title: "Meals — InsulinaApp" }] }),
  component: MealsPage,
});

function MealsPage() {
  const lang = useLang();
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setMeals(getMeals());
    refresh();
    window.addEventListener("insulina:update", refresh);
    return () => window.removeEventListener("insulina:update", refresh);
  }, []);

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">{t("meals.title")}</h1>
        <Link to="/meals/new" className="btn-primary px-4 py-2 text-sm">
          <Plus className="mr-1 size-4" /> {t("meals.newBtn")}
        </Link>
      </div>

      {meals.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center text-muted-foreground">
          <Utensils className="size-12 text-secondary" />
          <p className="mt-4 text-base">{t("meals.empty")}</p>
          <Link to="/meals/new" className="btn-primary mt-4">
            {t("meals.firstCta")}
          </Link>
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {meals.map((m) => {
            const isOpen = expandedId === m.id;
            return (
              <li key={m.id}>
                <SwipeRow
                  onDelete={() => {
                    if (window.confirm("¿Eliminar este registro?")) deleteMeal(m.id);
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId((prev) => (prev === m.id ? null : m.id))}
                    className="w-full text-left"
                  >
                    <div className="p-4">
                      <div className="flex items-baseline justify-between">
                        <span className="text-lg font-semibold text-primary">
                          {Math.round(totalCarbs(m.foods))}{t("meals.carbsUnit")}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(m.timestamp).toLocaleString(locale(lang), {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <ChevronDown
                            className={`size-4 text-muted-foreground transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {m.foods.map((f) => f.name).join(" · ")}
                      </p>
                      {m.notes && <p className="mt-1 text-sm">{m.notes}</p>}
                    </div>
                    {isOpen && (
                      <div className="border-t border-border px-4 py-3">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-muted-foreground">
                              <th className="text-left font-medium">Alimento</th>
                              <th className="text-right font-medium">Gramos</th>
                              <th className="text-right font-medium">CHO</th>
                            </tr>
                          </thead>
                          <tbody>
                            {m.foods.map((f, i) => (
                              <tr key={i}>
                                <td className="py-1">{f.name}</td>
                                <td className="py-1 text-right tabular-nums">{f.grams}g</td>
                                <td className="py-1 text-right tabular-nums">
                                  {Math.round((f.carbsPer100g * f.grams) / 100)}g
                                </td>
                              </tr>
                            ))}
                            <tr className="border-t border-border font-semibold">
                              <td className="pt-2">Total</td>
                              <td className="pt-2 text-right text-muted-foreground">—</td>
                              <td className="pt-2 text-right tabular-nums text-primary">
                                {Math.round(totalCarbs(m.foods))}g
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </button>
                </SwipeRow>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
