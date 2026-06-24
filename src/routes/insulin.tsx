import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { addInsulin, type InsulinEntry, type InsulinSite } from "@/lib/storage";

export const Route = createFileRoute("/insulin")({
  head: () => ({ meta: [{ title: "Log insulin — InsulinaApp" }] }),
  component: InsulinPage,
});

const sites: InsulinSite[] = [
  "Abdomen",
  "Left thigh",
  "Right thigh",
  "Left arm",
  "Right arm",
  "Buttock",
];

function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function InsulinPage() {
  const navigate = useNavigate();
  const [type, setType] = useState<InsulinEntry["type"]>("NPH");
  const [units, setUnits] = useState<number | "">("");
  const [site, setSite] = useState<InsulinSite>("Abdomen");
  const [time, setTime] = useState<string>(nowLocalInput());
  const [notes, setNotes] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof units !== "number" || units <= 0) return;
    addInsulin({
      type,
      units,
      site,
      notes: notes.trim() || undefined,
      timestamp: new Date(time).toISOString(),
    });
    navigate({ to: "/history" });
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-primary">Log insulin</h1>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <div>
          <span className="mb-2 block text-sm font-medium">Type</span>
          <div className="grid grid-cols-2 gap-2">
            {(["NPH", "Lispro"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-lg border px-3 py-4 text-base font-semibold transition-colors ${
                  type === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Units</span>
          <input
            type="number"
            inputMode="decimal"
            step={0.5}
            min={0.5}
            value={units}
            onChange={(e) =>
              setUnits(e.target.value === "" ? "" : Number(e.target.value))
            }
            required
            className="input text-2xl font-semibold"
            placeholder="e.g. 6"
          />
        </label>

        <div>
          <span className="mb-2 block text-sm font-medium">Injection site</span>
          <div className="grid grid-cols-2 gap-2">
            {sites.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSite(s)}
                className={`rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
                  site === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Time</span>
          <input
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="input"
          />
        </label>

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
