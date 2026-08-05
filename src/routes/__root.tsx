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
    <div className="flex min-h-screen min-h-dvh items-center justify-center bg-background px-4">
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
    <div className="flex min-h-screen min-h-dvh items-center justify-center bg-background px-4">
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
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='insulina:theme',s=localStorage.getItem(k),d=s==='dark'||(!s&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}})()`,
          }}
        />
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
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  // `null` = "aún no sabemos" (coincide en servidor y cliente); string | false = ya resuelto.
  const [storedPin, setStoredPin] = useState<string | null | false>(null);

  useEffect(() => {
    const onSaved = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      setSavedToast(detail?.message || "Guardado");
      window.setTimeout(() => setSavedToast(null), 2000);
    };
    window.addEventListener("insulina:saved", onSaved as EventListener);
    return () => window.removeEventListener("insulina:saved", onSaved as EventListener);
  }, []);

  useEffect(() => {
    // Se ejecuta solo en el cliente, después de hidratar — nunca en SSR.
    setStoredPin(getPin() ?? false);
  }, []);

  // Mientras no sepamos si hay PIN, no renderizamos nada (ni el shell real ni la
  // pantalla de bloqueo): así el HTML del cliente coincide con el del servidor
  // y los datos sensibles nunca llegan al DOM antes de verificar el PIN.
  if (storedPin === null) {
    return (
      <div className="fixed inset-0 bg-background" />
    );
  }

  if (storedPin && !unlocked) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-5 bg-background p-8 text-foreground"
        style={{
          paddingTop: "env(safe-area-inset-top, 2rem)",
          paddingBottom: "env(safe-area-inset-bottom, 2rem)",
        }}
      >
        <p className="text-5xl">💉</p>
        <h1 className="text-center text-2xl font-bold text-primary">
          InsulinaApp
        </h1>
        <p className="text-center text-sm text-muted-foreground">
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
          className={`w-32 rounded-xl border-2 bg-card p-3 text-center text-2xl text-foreground outline-hidden focus:ring-3 focus:ring-ring/30 ${
            pinError ? "border-danger" : "border-secondary"
          }`}
          style={{ letterSpacing: "0.5rem" }}
          placeholder="••••"
        />
        {pinError && (
          <p className="text-xs text-danger">
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
          ✓ {savedToast}
        </div>
      )}
    </QueryClientProvider>
  );
}
