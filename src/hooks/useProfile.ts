import { useEffect, useState } from "react";
import { getProfile, type Profile } from "@/lib/storage";

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setProfile(getProfile());
    setReady(true);
    const handler = () => setProfile(getProfile());
    window.addEventListener("insulina:update", handler);
    return () => window.removeEventListener("insulina:update", handler);
  }, []);
  return { profile, ready };
}
