import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional().nullable().or(z.literal('')).or(z.literal('null')),
  phone: z.string().max(20).optional().nullable().or(z.literal('')),
  address: z.string().max(500).optional().nullable().or(z.literal(''))
});
