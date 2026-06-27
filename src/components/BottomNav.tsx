import { Link } from "@tanstack/react-router";
import { Home, Syringe, Utensils, History, Bell } from "lucide-react";
import { t, useLang } from "@/lib/i18n";

const tabs = [
  { to: "/", key: "nav.home", icon: Home },
  { to: "/insulin", key: "nav.insulin", icon: Syringe },
  { to: "/meals", key: "nav.meals", icon: Utensils },
  { to: "/alerts", key: "nav.alerts", icon: Bell },
  { to: "/history", key: "nav.history", icon: History },
] as const;

export function BottomNav() {
  useLang();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card">
      <ul className="mx-auto flex max-w-md">
        {tabs.map(({ to, key, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex flex-col items-center gap-1 py-3 text-xs font-medium"
            >
              <Icon className="size-6" />
              {t(key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
