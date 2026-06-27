import { getLang, setLang, useLang } from "@/lib/i18n";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const lang = useLang();
  return (
    <div className={`inline-flex rounded-md border border-border bg-card p-0.5 text-xs font-medium ${className}`}>
      {(["es", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`rounded px-2 py-1 ${
            (lang || getLang()) === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
