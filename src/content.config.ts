import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

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
    ingredients: z.array(
      z.object({
        name: z.string(),
        quantity: z.number(),
        unit: z.string().optional().default(""),
      })
    ),
  }),
});

export const collections = { recipes };
