import { defineCollection, z } from 'astro:content';

const reference = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  author: z.string().optional(),
  publishedAt: z.string().optional(),
});

const social = z.object({
  author: z.string(),
  url: z.string().url(),
  platform: z.enum(['x', 'linkedin', 'mastodon', 'bluesky', 'threads', 'youtube', 'other']),
  postedAt: z.string().optional(),
});

const heroEmbed = z.object({
  type: z.enum(['youtube', 'x', 'image']),
  src: z.string(),
  alt: z.string().optional(),
});

const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().min(1).max(100),
    date: z.coerce.date(),
    category: z.enum(['model-releases', 'research', 'insights', 'guides']),
    tags: z.array(z.string()).min(1).max(6),
    summary: z.string().min(20).max(220),
    audience: z.enum(['general', 'developer']).default('general'),
    practicalGuide: z.object({
      timeToTry: z.string(),
      prerequisites: z.array(z.string()).default([]),
    }),
    references: z.array(reference).min(1),
    social: z.array(social).optional(),
    heroEmbed: heroEmbed.optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles };
