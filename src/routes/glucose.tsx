import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { addGlucose, type GlucoseEntry } from "@/lib/storage";

export const Route = createFileRoute("/glucose")({
  head: () => ({ meta: [{ title: "Log glucose — InsulinaApp" }] }),
  component: GlucosePage,
});

const moments: GlucoseEntry["moment"][] = [
  "Fasting",
  "Pre-meal",
  "Post-meal",
  "Bedtime",
  "Overnight",
];

function GlucosePage() {
  const navigate = useNavigate();
  const [value, setValue] = useState<number | "">("");
  const [moment, setMoment] = useState<GlucoseEntry["moment"]>("Fasting");
  const [notes, setNotes] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof value !== "number" || value <= 0) return;
    addGlucose({
      value,
      moment,
      notes: notes.trim() || undefined,
      timestamp: new Date().toISOString(),
    });
    navigate({ to: "/" });
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-primary">Log glucose</h1>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Glucose (mg/dL)</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={value}
            onChange={(e) =>
              setValue(e.target.value === "" ? "" : Number(e.target.value))
            }
            required
            className="input text-2xl font-semibold"
            placeholder="e.g. 110"
          />
        </label>

        <div>
          <span className="mb-2 block text-sm font-medium">Moment</span>
          <div className="grid grid-cols-2 gap-2">
            {moments.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMoment(m)}
                className={`rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
                  moment === m
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="input"
          />
        </label>

        <button type="submit" className="btn-primary w-full">
          Save
        </button>
      </form>
    </AppShell>
  );
}
