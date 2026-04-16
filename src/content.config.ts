import { type CollectionEntry, defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

import { FAVORITE_TYPES } from './constants/memorabilia';

const favoriteTypesArray = Object.values(FAVORITE_TYPES).map((type) => type.toLowerCase()) as [string, ...string[]];

const favoritesCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/favorites' }),
  schema: z.object({
    title: z.string(),
    year: z.number(),
    favoriteType: z.enum(favoriteTypesArray),
    imageId: z.string(),
    description: z.string().optional()
  })
});

const experienceSchema = z.object({
  company: z.string(),
  position: z.string(),
  type: z.enum(['work', 'project']),
  startDate: z.string().transform((date) => new Date(date)),
  endDate: z
    .string()
    .optional()
    .transform((date) => (date ? new Date(date) : null)),
  description: z.string().optional(),
  tags: z.array(z.string()).optional()
});

const experienceCollection = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/experience' }),
  schema: experienceSchema
});

export const collections = {
  favorites: favoritesCollection,
  experience: experienceCollection
};

export type FavoritesCollection = CollectionEntry<'favorites'>[];
export type FavoritesCollectionEntry = CollectionEntry<'favorites'>;

export type ExperienceCollection = CollectionEntry<'experience'>[];
export type ExperienceCollectionEntry = CollectionEntry<'experience'>;
