import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Utensils } from "lucide-react";

export const Route = createFileRoute("/meals")({
  head: () => ({ meta: [{ title: "Meals — InsulinaApp" }] }),
  component: MealsPage,
});

function MealsPage() {
  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-primary">Meals</h1>
      <div className="mt-12 flex flex-col items-center text-center text-muted-foreground">
        <Utensils className="size-12 text-secondary" />
        <p className="mt-4 text-base">Meal tracking is coming soon.</p>
      </div>
    </AppShell>
  );
}
