import { z } from 'zod';

// Engine values — single source of truth is packages/recorder/src/types.ts.
export const recordModeSchema = z.enum(['screen+cam+cursor', 'screen+cursor', 'cam-only']);

const qaSchema = z.object({ question: z.string().min(1), answer: z.string().min(1) });
const stepSchema = z.object({ name: z.string().min(1), text: z.string().min(1) });

export const featureFrontmatterSchema = z.object({
  slug: z.string().min(1),
  mode: recordModeSchema,
  title: z.string().min(1),
  deck: z.string().min(1),
  eyebrow: z.string().min(1),
  order: z.number().int(),
  howToSteps: z.array(stepSchema).min(1),
  faq: z.array(qaSchema),
  related: z.array(z.string()),
});

export const docFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1).max(160),
  slug: z.array(z.string().min(1)).min(1),
  section: z.string().min(1),
  order: z.number().int(),
  faq: z.array(qaSchema).optional(),
  draft: z.boolean().default(false),
  updated: z.string().optional(),
});

export type FeatureFrontmatter = z.infer<typeof featureFrontmatterSchema>;
export type DocFrontmatter = z.infer<typeof docFrontmatterSchema>;
export type Qa = z.infer<typeof qaSchema>;
export type HowToStep = z.infer<typeof stepSchema>;
