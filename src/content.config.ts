import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { AISLES } from "./lib/shopping";

const ingredients = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/ingredients" }),
  schema: z.object({
    title: z.string(),
    aisle: z.enum(AISLES).catch("Other"),
    onHand: z.boolean().nullish().transform((v) => v ?? false),
  }),
});

const recipes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    category: z.string(),
    image: z.string().optional(),
    cookTime: z.string().optional(),
    prepTime: z.string().optional(),
    servings: z.number(),
    tags: z.array(z.string()).optional(),
    description: z.string().nullish(),
    sourceName: z.string().nullish(),
    sourceUrl: z.string().nullish(),
    ingredients: z.array(
      z.object({
        item: z.string(),
        prep: z.string().nullish(),
        quantity: z.number(),
        unit: z.string().nullish().transform((v) => v ?? ""),
      })
    ),
  }),
});

export const collections = { recipes, ingredients };
