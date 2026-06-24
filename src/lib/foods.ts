// Food search — local preloaded + Open Food Facts API
export type FoodResult = {
  name: string;
  carbsPer100g: number;
  source: "local" | "off";
};

export const PRELOADED_FOODS: FoodResult[] = [
  { name: "Corn tortilla", carbsPer100g: 44, source: "local" },
  { name: "White rice (cooked)", carbsPer100g: 28, source: "local" },
  { name: "Black beans (cooked)", carbsPer100g: 23, source: "local" },
  { name: "White bread", carbsPer100g: 49, source: "local" },
  { name: "Orange juice", carbsPer100g: 10, source: "local" },
  { name: "Whole milk", carbsPer100g: 5, source: "local" },
  { name: "Avocado", carbsPer100g: 9, source: "local" },
  { name: "Banana", carbsPer100g: 23, source: "local" },
  { name: "Apple", carbsPer100g: 14, source: "local" },
  { name: "Oatmeal (cooked)", carbsPer100g: 12, source: "local" },
  { name: "Pasta (cooked)", carbsPer100g: 25, source: "local" },
  { name: "Potato (boiled)", carbsPer100g: 17, source: "local" },
];

function searchLocal(query: string): FoodResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return PRELOADED_FOODS.filter((f) => f.name.toLowerCase().includes(q));
}

type OFFProduct = {
  product_name?: string;
  generic_name?: string;
  brands?: string;
  nutriments?: { carbohydrates_100g?: number };
};

export async function searchFoods(query: string, signal?: AbortSignal): Promise<FoodResult[]> {
  const q = query.trim();
  if (!q) return [];
  const local = searchLocal(q);

  try {
    const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
    url.searchParams.set("search_terms", q);
    url.searchParams.set("search_simple", "1");
    url.searchParams.set("action", "process");
    url.searchParams.set("json", "1");
    url.searchParams.set("page_size", "15");
    url.searchParams.set("fields", "product_name,generic_name,brands,nutriments");

    const res = await fetch(url.toString(), { signal });
    if (!res.ok) return local;
    const data = (await res.json()) as { products?: OFFProduct[] };
    const remote: FoodResult[] = [];
    for (const p of data.products ?? []) {
      const name =
        p.product_name?.trim() || p.generic_name?.trim() || p.brands?.trim() || "";
      const carbs = p.nutriments?.carbohydrates_100g;
      if (!name || typeof carbs !== "number" || Number.isNaN(carbs)) continue;
      remote.push({
        name,
        carbsPer100g: Math.round(carbs * 10) / 10,
        source: "off",
      });
      if (remote.length >= 12) break;
    }

    const seen = new Set<string>();
    return [...local, ...remote].filter((f) => {
      const k = f.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  } catch {
    return local;
  }
}
