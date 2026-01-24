import { defineCollection, z } from "astro:content";

const services = defineCollection({
  schema: z.object({
    title: z.string(),
    title_en: z.string().optional(),
    specification: z.string().optional(),
    specification_en: z.string().optional(),
    img: z.string(),
    description: z.string(),
    description_en: z.string().optional(),
    sortOrder: z.number().default(999),

    // New Structured Data
    hero: z.object({
      subtitle: z.string().optional(), // "Automatización de procesos internos"
      subtitle_en: z.string().optional(),
      phrase: z.string().optional(), // "Elimina tareas manuales..."
      phrase_en: z.string().optional(),
      cta: z.string().optional(), // "Agendar llamada de evaluación"
      cta_en: z.string().optional(),
    }).optional(),

    problem: z.object({
      statement: z.string().optional(), // "Muchas empresas funcionan..."
      statement_en: z.string().optional(),
      points: z.array(z.string()).optional(), // List of problems
      points_en: z.array(z.string()).optional(),
    }).optional(),

    solution: z.object({
      title: z.string().optional(),
      title_en: z.string().optional(),
      description: z.string().optional(), // "Flow Line convierte..."
      description_en: z.string().optional(),
    }).optional(),

    automation: z.object({
      title: z.string().optional(),
      title_en: z.string().optional(),
      items: z.array(z.string()).optional(), // Grid items
      items_en: z.array(z.string()).optional(),
    }).optional(),

    benefits: z.object({
      title: z.string().optional(),
      title_en: z.string().optional(),
      items: z.array(z.string()).optional(), // Checkmark items
      items_en: z.array(z.string()).optional(),
    }).optional(),

    use_cases: z.object({
      title: z.string().optional(),
      title_en: z.string().optional(),
      items: z.array(z.string()).optional(), // Cards
      items_en: z.array(z.string()).optional(),
    }).optional(),

    methodology: z.object({
      title: z.string().optional(),
      title_en: z.string().optional(),
      steps: z.array(z.string()).optional(), // Timeline steps
      steps_en: z.array(z.string()).optional(),
    }).optional(),

    final_cta: z.object({
      text: z.string().optional(),
      text_en: z.string().optional(),
      button_text: z.string().optional(),
      button_text_en: z.string().optional(),
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
    title_en: z.string().optional(),
    img: z.string().optional(),
    description: z.string().optional(),
    description_en: z.string().optional(),
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

const faq = defineCollection({
  schema: z.object({
    title: z.string(),
    title_en: z.string().optional(),
    sortOrder: z.number().default(999),
    faqs: z.array(
      z.object({
        question: z.string(),
        question_en: z.string().optional(),
        answer: z.string(),
        answer_en: z.string().optional(),
      })
    ),
  }),
});

export const collections = { services, benefits, faq };
