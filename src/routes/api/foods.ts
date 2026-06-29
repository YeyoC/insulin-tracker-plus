import { createFileRoute } from "@tanstack/react-router";

type OffProduct = {
  product_name?: string;
  brands?: string;
  nutriments?: { carbohydrates_100g?: number | string };
};

type FoodOut = {
  name: string;
  carbsPer100g: number;
  source: "off";
  category: string;
};

const CACHE = new Map<string, { at: number; data: FoodOut[] }>();
const TTL = 10 * 60 * 1000;

async function fetchOff(q: string, signal: AbortSignal): Promise<FoodOut[]> {
  const url =
    "https://world.openfoodfacts.org/cgi/search.pl" +
    `?search_terms=${encodeURIComponent(q)}` +
    "&search_simple=1&action=process&json=1&page_size=20" +
    "&fields=product_name,brands,nutriments,countries_tags" +
    "&tagtype_0=countries&tag_contains_0=contains&tag_0=mexico";
  const res = await fetch(url, {
    signal,
    headers: { "User-Agent": "InsulinaApp/1.0" },
  });
  if (!res.ok) throw new Error("off failed");
  const json = (await res.json()) as { products?: OffProduct[] };
  const out: FoodOut[] = [];
  for (const p of json.products ?? []) {
    const name = (p.product_name ?? "").trim();
    if (!name) continue;
    const raw = p.nutriments?.carbohydrates_100g;
    const carbs = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(carbs) || carbs < 0) continue;
    out.push({
      name: name + (p.brands ? " · " + p.brands : ""),
      carbsPer100g: Math.round(carbs * 10) / 10,
      source: "off",
      category: "Búsqueda",
    });
    if (out.length >= 15) break;
  }
  return out;
}

export const Route = createFileRoute("/api/foods")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").toLowerCase().trim();
        if (q.length < 2) {
          return new Response("[]", {
            headers: { "Content-Type": "application/json" },
          });
        }

        const cached = CACHE.get(q);
        if (cached && Date.now() - cached.at < TTL) {
          return new Response(JSON.stringify(cached.data), {
            headers: { "Content-Type": "application/json", "X-Source": "cache" },
          });
        }

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        try {
          const data = await fetchOff(q, ctrl.signal);
          CACHE.set(q, { at: Date.now(), data });
          return new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json", "X-Source": "off" },
          });
        } catch {
          return new Response("[]", {
            headers: { "Content-Type": "application/json", "X-Source": "fallback" },
          });
        } finally {
          clearTimeout(timer);
        }
      },
    },
  },
});
