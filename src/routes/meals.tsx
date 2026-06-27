import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Utensils } from "lucide-react";
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
          {meals.map((m) => (
            <li key={m.id}>
              <SwipeRow onDelete={() => deleteMeal(m.id)}>
                <div className="p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-semibold text-primary">
                      {Math.round(totalCarbs(m.foods))}{t("meals.carbsUnit")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.timestamp).toLocaleString(locale(lang), {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {m.foods.map((f) => f.name).join(" · ")}
                  </p>
                  {m.notes && <p className="mt-1 text-sm">{m.notes}</p>}
                </div>
              </SwipeRow>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
