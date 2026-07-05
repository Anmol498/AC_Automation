import { z } from 'zod';

const baseWorkSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  work_description: z.string().min(1).max(2000),
  qty: z.union([z.string(), z.number()]).transform(val => String(val)),
  remarks: z.string().max(2000).optional().nullable().or(z.literal('')),
  address: z.string().max(1000).optional().nullable().or(z.literal(''))
});

export const dailyWorkSchema = baseWorkSchema.extend({
  technician: z.string().max(255).optional().nullable().or(z.literal(''))
});

export const technicianWorkSchema = baseWorkSchema;
