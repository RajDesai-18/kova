import { z } from 'zod';

export const createDocumentSchema = z.object({
  title: z.string().optional().default('Untitled'),
  parentId: z.string().nullable().optional(),
  content: z.any().optional(),
  icon: z.string().optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().optional(),
  content: z.any().optional(),
  icon: z.string().nullable().optional(),
  isArchived: z.boolean().optional(),
  parentId: z.string().nullable().optional(),
  position: z.number().optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
