import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen min-h-dvh bg-background"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div
        className="mx-auto max-w-md px-5 pt-6 relative"
        style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
