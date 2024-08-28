import { type CollectionEntry, defineCollection, z } from 'astro:content';

import { FAVORITE_TYPES } from '../constants/memorabilia';

const favoriteTypesArray = Object.values(FAVORITE_TYPES).map((type) => type.toLowerCase()) as [string, ...string[]];

const favoritesSchema = defineCollection({
  type: 'content',
  // The following uses zod to define the schema. For more info:
  // https://docs.astro.build/en/guides/content-collections/#defining-datatypes-with-zod
  schema: ({}) =>
    z.object({
      title: z.string(),
      year: z.number(),
      favoriteType: z.enum(favoriteTypesArray),
      imageId: z.string()
    })
});

export const collections = {
  favorites: favoritesSchema
};

export type FavoritesCollection = CollectionEntry<'favorites'>[];
export type FavoritesCollectionEntry = CollectionEntry<'favorites'>;
