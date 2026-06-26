import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { getAlerts } from "@/lib/alerts";
import { getGlucose, getProfile } from "@/lib/storage";

/** Full-screen red overlay when glucose < 55 and no alert response in 10 min. */
export function CriticalGlucoseOverlay() {
  const [show, setShow] = useState(false);
  const [contact, setContact] = useState<{ name: string; phone: string } | null>(null);

  useEffect(() => {
    const tick = () => {
      const profile = getProfile();
      setContact(profile?.emergencyContact ?? null);
      const latest = getGlucose()[0];
      if (!latest || latest.value >= 55) {
        setShow(false);
        return;
      }
      const ageMin = (Date.now() - new Date(latest.timestamp).getTime()) / 60_000;
      if (ageMin < 10 || ageMin > 60) {
        setShow(false);
        return;
      }
      // Check if any orange alert was responded to since glucose reading
      const responded = getAlerts().some(
        (a) =>
          a.level === "orange" &&
          new Date(a.firedAt).getTime() >= new Date(latest.timestamp).getTime() &&
          !!a.response,
      );
      setShow(!responded);
    };
    tick();
    const i = setInterval(tick, 30_000);
    window.addEventListener("insulina:update", tick);
    return () => {
      clearInterval(i);
      window.removeEventListener("insulina:update", tick);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-red-700 px-6 text-center text-white">
      <div>
        <p className="text-sm uppercase tracking-widest opacity-80">Critical glucose</p>
        <h1 className="mt-2 text-4xl font-bold">Get help now</h1>
        {contact ? (
          <>
            <p className="mt-6 text-xl">Call {contact.name}</p>
            <p className="text-2xl font-mono">{contact.phone}</p>
            <a
              href={`tel:${contact.phone}`}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-lg font-bold text-red-700"
            >
              <Phone className="size-5" /> Call now
            </a>
          </>
        ) : (
          <p className="mt-6 text-base opacity-90">
            Add an emergency contact in Settings.
          </p>
        )}
        <button
          onClick={() => setShow(false)}
          className="mt-8 block w-full text-sm underline opacity-80"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
