import { Link } from "@tanstack/react-router";
import { Home, Syringe, Utensils, History } from "lucide-react";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/insulin", label: "Insulin", icon: Syringe },
  { to: "/meals", label: "Meals", icon: Utensils },
  { to: "/history", label: "History", icon: History },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card">
      <ul className="mx-auto flex max-w-md">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex flex-col items-center gap-1 py-3 text-xs font-medium"
            >
              <Icon className="size-6" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
