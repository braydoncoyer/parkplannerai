import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    parks: z.array(z.string()).optional(),
    category: z.enum([
      'wait-times-by-land',
      'hour-by-hour',
      'day-of-week',
      'cross-park',
      'behavioral',
      'ride-category',
      'data-story',
    ]),
  }),
});

export const collections = { blog };
