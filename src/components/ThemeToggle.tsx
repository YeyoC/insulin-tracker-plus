import { Moon, Sun } from "lucide-react";
import { t, useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export function ThemeToggle() {
  useLang();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? t("theme.useLight") : t("theme.useDark");

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="grid size-11 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent"
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}