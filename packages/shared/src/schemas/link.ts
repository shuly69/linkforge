import { z } from "zod";

/** Optional custom alias: 3–32 chars, url-safe (letters, digits, - and _). */
const aliasSchema = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_-]+$/, "Alias may only contain letters, digits, - and _");

export const createLinkSchema = z.object({
  url: z.string().url("Must be a valid URL").max(2048),
  customAlias: aliasSchema.optional(),
  /** Optional expiry as an ISO-8601 timestamp. */
  expiresAt: z.string().datetime().optional(),
});

export const updateLinkSchema = z.object({
  url: z.string().url().max(2048).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const listLinksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
});

export type CreateLinkDto = z.infer<typeof createLinkSchema>;
export type UpdateLinkDto = z.infer<typeof updateLinkSchema>;
export type ListLinksQuery = z.infer<typeof listLinksQuerySchema>;

export interface Link {
  id: string;
  code: string;
  url: string;
  shortUrl: string;
  clickCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
