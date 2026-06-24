import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().max(20).optional().nullable().or(z.literal('')),
  subject: z.string().max(255).optional().nullable().or(z.literal('')),
  message: z.string().min(1).max(5000)
});
