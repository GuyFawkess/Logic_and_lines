import { defineCollection, z } from "astro:content";

const services = defineCollection({
  schema: z.object({
    title: z.string(),
    title_es: z.string().optional(), // Spanish title
    img: z.string(),
    description: z.string(),
    description_es: z.string().optional(), // Spanish description
    sortOrder: z.number().default(999),
    images: z.array(z.string()).optional(),
    paragraphs: z.array(z.string()).optional(),
    paragraphs_es: z.array(z.string()).optional(), // Spanish paragraphs
    prices: z.array(
      z.object({
        duration: z.string(),
        price: z.number(),
      })
    ).optional(),
  }),
});

const benefits = defineCollection({
  schema: z.object({
    title: z.string(),
    title_es: z.string().optional(),
    img: z.string().optional(),
    description: z.string().optional(),
    description_es: z.string().optional(),
    sortOrder: z.number().default(999),
    // items: z
    //   .array(
    //     z.object({
    //       label: z.string(),
    //       label_es: z.string().optional(),
    //       icon: z.string().optional(),
    //     })
    //   )
    //   .optional(),
  }),
});

export const collections = { services, benefits };
