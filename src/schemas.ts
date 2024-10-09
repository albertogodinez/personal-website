import { z } from 'astro:content';

export const experienceSchema = ({}) =>
  z.object({
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
    // TODO: later on I can add some of the following
    // - list of technologies used
    // - list of projects worked on
    //
  });
