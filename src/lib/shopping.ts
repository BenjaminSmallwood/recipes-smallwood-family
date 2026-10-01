import { formatQuantity, normalizeUnit } from "./recipe";

// Store order: the shopping list is grouped by aisle in this order
export const AISLES = [
  "Produce",
  "Meat & Seafood",
  "Dairy & Eggs",
  "Bakery",
  "Canned & Jarred",
  "Pasta & Grains",
  "Baking",
  "Spices & Seasonings",
  "Oils & Condiments",
  "Frozen",
  "Household & Personal Care",
  "Other",
] as const;

export interface ListIngredient {
  name: string;
  quantity: number;
  unit: string;
  aisle: string;
  onHand: boolean;
}

export interface ListRecipe {
  slug: string;
  title: string;
  multiplier: number;
  ingredients: ListIngredient[];
}

export interface CustomItem {
  id: string;
  name: string;
  aisle: string;
}

export interface ListLine {
  key: string;
  custom?: boolean;
  name: string;
  aisle: string;
  onHand: boolean;
  amount: string;
  recipes: string[];
}

// Units that convert within a family, as multiples of the family's smallest unit
const FAMILIES: Record<string, { base: Record<string, number>; display: [string, number][] }> = {
  volume: {
    base: { teaspoon: 1, tablespoon: 3, cup: 48 },
    display: [["cup", 48], ["tbsp", 3], ["tsp", 1]],
  },
  weight: {
    base: { ounce: 1, pound: 16 },
    display: [["lb", 16], ["oz", 1]],
  },
};

function familyOf(unit: string): string | null {
  const u = normalizeUnit(unit);
  for (const [family, { base }] of Object.entries(FAMILIES)) {
    if (u in base) return family;
  }
  return null;
}

// Largest unit (no bigger than any the recipes used) that reads as a whole number or
// common fraction: "1 ⅔ tbsp" rather than "0.1 cup", and canned "30 oz" stays in oz
function formatFamily(family: string, baseQty: number, largestUsed: number): string {
  const { display } = FAMILIES[family];
  for (const [unit, size] of display) {
    if (size > largestUsed) continue;
    const qty = baseQty / size;
    const text = formatQuantity(qty);
    if ((qty >= 1 || size === largestUsed) && !text.includes(".")) {
      return `${text} ${unit === "cup" && qty > 1 ? "cups" : unit}`;
    }
  }
  const [unit, size] = display[display.length - 1];
  return `${formatQuantity(baseQty / size)} ${unit}`;
}

// Recipe ingredients are combined by name; one-off custom items are kept as their own lines
export function buildShoppingList(recipes: ListRecipe[], custom: CustomItem[] = []): ListLine[] {
  const groups = new Map<string, { line: ListLine; buckets: Map<string, { unit: string; qty: number; family: string | null; largest: number }> }>();

  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      const key = ing.name.toLowerCase();
      let group = groups.get(key);
      if (!group) {
        group = {
          line: { key, name: ing.name, aisle: ing.aisle, onHand: ing.onHand, amount: "", recipes: [] },
          buckets: new Map(),
        };
        groups.set(key, group);
      }
      if (!group.line.recipes.includes(recipe.title)) group.line.recipes.push(recipe.title);

      const qty = ing.quantity * recipe.multiplier;
      const family = familyOf(ing.unit);
      const bucketKey = family ?? normalizeUnit(ing.unit);
      const bucket = group.buckets.get(bucketKey) ?? { unit: ing.unit, qty: 0, family, largest: 0 };
      const size = family ? FAMILIES[family].base[normalizeUnit(ing.unit)] : 1;
      bucket.qty += qty * size;
      bucket.largest = Math.max(bucket.largest, size);
      group.buckets.set(bucketKey, bucket);
    }
  }

  const lines = [...groups.values()].map(({ line, buckets }) => {
    line.amount = [...buckets.values()]
      .map((b) => (b.family ? formatFamily(b.family, b.qty, b.largest) : `${formatQuantity(b.qty)}${b.unit ? " " + b.unit : ""}`))
      .join(" + ");
    return line;
  });

  for (const item of custom) {
    lines.push({ key: `custom:${item.id}`, custom: true, name: item.name, aisle: item.aisle, onHand: false, amount: "", recipes: [] });
  }

  const aisleIndex = (aisle: string) => {
    const i = (AISLES as readonly string[]).indexOf(aisle);
    return i === -1 ? AISLES.length : i;
  };
  return lines.sort((a, b) => aisleIndex(a.aisle) - aisleIndex(b.aisle) || a.name.localeCompare(b.name));
}
