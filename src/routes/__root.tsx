import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
 
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { useAlertsEngine } from "../hooks/useAlertsEngine";
import { t } from "../lib/i18n";
import { getPin } from "../lib/storage";
 
function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("err.404")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("err.404desc")}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("err.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
 
function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
 
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("err.failed")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("err.failedDesc")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("err.retry")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("err.goHome")}
          </a>
        </div>
      </div>
    </div>
  );
}
 
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "InsulinaApp" },
      { name: "description", content: "Gestión de insulina para pacientes diabéticos" },
      { property: "og:title", content: "InsulinaApp — Gestión de insulina" },
      { property: "og:type", content: "website" },
      { name: "theme-color", content: "#1A3A5C" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "InsulinaApp" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});
 
function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
 
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useAlertsEngine();
  const [savedToast, setSavedToast] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
 
  useEffect(() => {
    const onSaved = () => {
      setSavedToast(true);
      window.setTimeout(() => setSavedToast(false), 2000);
    };
    window.addEventListener("insulina:saved", onSaved as EventListener);
    return () => window.removeEventListener("insulina:saved", onSaved as EventListener);
  }, []);
 
  const storedPin = getPin();
  if (storedPin && !unlocked) {
    return (
      <div style={{
        position: "fixed", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: "1.25rem",
        backgroundColor: "#f5f8ff", padding: "2rem",
        paddingTop: "env(safe-area-inset-top, 2rem)",
        paddingBottom: "env(safe-area-inset-bottom, 2rem)",
      }}>
        <p style={{ fontSize: "3rem" }}>💉</p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1A3A5C", textAlign: "center" }}>
          InsulinaApp
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#64748b", textAlign: "center" }}>
          Ingresa tu PIN para continuar
        </p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pinInput}
          autoFocus
          onChange={(e) => {
            setPinInput(e.target.value);
            setPinError(false);
            if (e.target.value.length === 4) {
              if (e.target.value === storedPin) {
                setUnlocked(true);
              } else {
                setPinError(true);
                setPinInput("");
              }
            }
          }}
          style={{
            width: "8rem", textAlign: "center", fontSize: "1.5rem",
            letterSpacing: "0.5rem", padding: "0.75rem", minHeight: "44px",
            border: pinError ? "2px solid #ef4444" : "2px solid #1A6B9A",
            borderRadius: "0.75rem", outline: "none", backgroundColor: "#ffffff",
          }}
          placeholder="••••"
        />
        {pinError && (
          <p style={{ color: "#ef4444", fontSize: "0.75rem" }}>
            PIN incorrecto. Intenta de nuevo.
          </p>
        )}
      </div>
    );
  }
 
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      {savedToast && (
        <div className="fixed left-1/2 top-4 z-[10000] -translate-x-1/2 rounded-full bg-success px-4 py-2 text-sm font-medium text-success-foreground shadow-lg">
          ✓ Guardado
        </div>
      )}
    </QueryClientProvider>
  );
}
 
