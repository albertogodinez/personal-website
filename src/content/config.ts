import { type CollectionEntry, defineCollection, z } from 'astro:content';

import { FAVORITE_TYPES } from '../constants/memorabilia';
import { experienceSchema } from '../schemas';

const favoriteTypesArray = Object.values(FAVORITE_TYPES).map((type) => type.toLowerCase()) as [string, ...string[]];

const favoritesCollection = defineCollection({
  type: 'content',
  // The following uses zod to define the schema. For more info:
  // https://docs.astro.build/en/guides/content-collections/#defining-datatypes-with-zod
  schema: ({}) =>
    z.object({
      title: z.string(),
      year: z.number(),
      favoriteType: z.enum(favoriteTypesArray),
      imageId: z.string(),
      description: z.string().optional()
    })
});

const experienceCollection = defineCollection({
  type: 'data',
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
