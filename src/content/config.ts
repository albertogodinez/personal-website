import { defineCollection, z } from 'astro:content';

const favoritesCollection = defineCollection({
  type: 'content',
  // The following uses zod to define the schema. For more info:
  // https://docs.astro.build/en/guides/content-collections/#defining-datatypes-with-zod
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      year: z.number(),
      // TODO: Add remaining favorite types
      favoriteType: z.enum(['sneakers']),
      image: image()
    })
});

console.log(favoritesCollection);

export const collections = {
  favorites: favoritesCollection
};
