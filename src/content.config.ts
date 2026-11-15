import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { TYPES } from './consts';

const entries = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/entries' }),
  schema: z
    .object({
      title: z.string().optional(),
      type: z.enum(TYPES),
      date: z.coerce.date(),
      tags: z.array(z.string()).default([]),
      url: z.url().optional(),
      repo: z.url().optional(),
      description: z.string().optional(),
      cover: z.string().optional(),
      topic: z.string().optional(),
      draft: z.boolean().default(false),
    })
    .refine((e) => e.type !== 'link' || e.url, { message: 'type "link" requires url' })
    .refine((e) => e.type === 'post' || e.title, { message: 'title is required (except for posts)' }),
});

export const collections = { entries };
