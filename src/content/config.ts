import { defineCollection, z } from "astro:content";

const services = defineCollection({
  schema: z.object({
    title: z.string(),
    title_es: z.string().optional(),
    specification: z.string().optional(),
    specification_es: z.string().optional(),
    img: z.string(),
    description: z.string(),
    description_es: z.string().optional(),
    sortOrder: z.number().default(999),

    // New Structured Data
    hero: z.object({
      subtitle: z.string().optional(), // "Automatización de procesos internos"
      phrase: z.string().optional(), // "Elimina tareas manuales..."
      cta: z.string().optional(), // "Agendar llamada de evaluación"
    }).optional(),

    problem: z.object({
      statement: z.string().optional(), // "Muchas empresas funcionan..."
      points: z.array(z.string()).optional(), // List of problems
    }).optional(),

    solution: z.object({
      title: z.string().optional(),
      description: z.string().optional(), // "Flow Line convierte..."
    }).optional(),

    automation: z.object({
      title: z.string().optional(),
      items: z.array(z.string()).optional(), // Grid items
    }).optional(),

    benefits: z.object({
      title: z.string().optional(),
      items: z.array(z.string()).optional(), // Checkmark items
    }).optional(),

    use_cases: z.object({
      title: z.string().optional(),
      items: z.array(z.string()).optional(), // Cards
    }).optional(),

    methodology: z.object({
      title: z.string().optional(),
      steps: z.array(z.string()).optional(), // Timeline steps
    }).optional(),

    final_cta: z.object({
      text: z.string().optional(),
      button_text: z.string().optional(),
    }).optional(),

    // Legacy/Optional fields
    images: z.array(z.string()).optional(),
    paragraphs: z.array(z.string()).optional(),
    paragraphs_es: z.array(z.string()).optional(),
    prices: z.array(
      z.object({
        duration: z.string(),
        price: z.number(),
      })
    ).optional(),
  }),
});

const reasons = defineCollection({
  schema: z.object({
    title: z.string(),
    title_es: z.string().optional(),
    img: z.string().optional(),
    description: z.string().optional(),
    description_es: z.string().optional(),
    sortOrder: z.number().default(999),

  }),
})

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
