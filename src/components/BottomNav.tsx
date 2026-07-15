import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Home, Syringe, Utensils, History, Bell } from "lucide-react";
import { t, useLang } from "@/lib/i18n";
import { alertsForDay } from "@/lib/alerts";

const tabs = [
  { to: "/", key: "nav.home", icon: Home },
  { to: "/insulin", key: "nav.insulin", icon: Syringe },
  { to: "/meals", key: "nav.meals", icon: Utensils },
  { to: "/alerts", key: "nav.alerts", icon: Bell },
  { to: "/history", key: "nav.history", icon: History },
] as const;

export function BottomNav() {
  useLang();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const check = () =>
      setHasUnread(alertsForDay(new Date()).some((a) => !a.response));
    check();
    const iv = setInterval(check, 60_000);
    window.addEventListener("insulina:update", check);
    return () => {
      clearInterval(iv);
      window.removeEventListener("insulina:update", check);
    };
  }, []);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="mx-auto flex max-w-md">
        {tabs.map(({ to, key, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="relative flex flex-col items-center gap-1 py-3 text-xs font-medium"
            >
              <span className="relative">
                <Icon className="size-6" />
                {to === "/alerts" && hasUnread && (
                  <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-danger ring-2 ring-card" />
                )}
              </span>
              {t(key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
