import { useEffect } from "react";
import { evaluateAlerts, requestNotificationPermission } from "@/lib/alerts";
import { pruneOldData } from "@/lib/storage";

/** Mount once at app root to run the alert engine every minute. */
export function useAlertsEngine() {
  useEffect(() => {
    requestNotificationPermission();
    evaluateAlerts();
    pruneOldData();
    const onUpdate = () => evaluateAlerts();
    window.addEventListener("insulina:update", onUpdate);
    const t = setInterval(() => evaluateAlerts(), 60_000);
    return () => {
      window.removeEventListener("insulina:update", onUpdate);
      clearInterval(t);
    };
  }, []);
}
