import { getCollection, type CollectionEntry } from "astro:content";
import type { Ingredient } from "./recipe";

export interface RecipeIngredient extends Ingredient {
  prep: string;
  aisle: string;
  onHand: boolean;
}

// Join a recipe's ingredients with the ingredient library (aisle, always-on-hand)
export async function getRecipeIngredients(recipe: CollectionEntry<"recipes">): Promise<RecipeIngredient[]> {
  const library = await getCollection("ingredients");
  const byName = new Map(library.map((entry) => [entry.data.title.toLowerCase(), entry.data]));

  return recipe.data.ingredients.map((ing) => {
    const entry = byName.get(ing.item.toLowerCase());
    if (!entry) {
      console.warn(`[recipes] "${ing.item}" in ${recipe.id} isn't in the ingredient library`);
    }
    return {
      name: ing.item,
      prep: ing.prep?.trim() ?? "",
      quantity: ing.quantity,
      unit: ing.unit,
      aisle: entry?.aisle ?? "Other",
      onHand: entry?.onHand ?? false,
    };
  });
}
