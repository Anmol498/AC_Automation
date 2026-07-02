import { z } from 'zod';

export const jobSchema = z.object({
  customerId: z.union([z.string(), z.number()]).transform(val => String(val)),
  jobType: z.enum(['Installation', 'Service']),
  technician: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  copperPipingCost: z.coerce.number().nonnegative().default(0),
  outdoorFittingCost: z.coerce.number().nonnegative().default(0),
  commissioningCost: z.coerce.number().nonnegative().default(0),
  equipmentCost: z.coerce.number().nonnegative().default(0)
});

export const paymentStatusSchema = z.object({
  paymentStatus: z.enum(['Pending', '1/3rd Received', '2/3rd Received', 'Fully Received'])
});

export const costsSchema = z.object({
  copperPipingCost: z.coerce.number().nonnegative(),
  outdoorFittingCost: z.coerce.number().nonnegative(),
  commissioningCost: z.coerce.number().nonnegative(),
  equipmentCost: z.coerce.number().nonnegative()
});

export const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  category: z.enum(['Low-Side', 'Equipment']),
  paymentMethod: z.string().min(1),
  notes: z.string().max(1000).optional().nullable().or(z.literal(''))
});

export const updatePhaseSchema = z.object({
  isCompleted: z.boolean(),
  customSubject: z.string().optional().nullable().or(z.literal('')),
  customGreeting: z.string().optional().nullable().or(z.literal('')),
  customMessage: z.string().optional().nullable().or(z.literal('')),
  customPaymentAmount: z.union([z.string(), z.number()]).optional().nullable().or(z.literal('')),
  skipEmail: z.boolean().optional().nullable(),
  sendWhatsApp: z.boolean().optional().nullable(),
  whatsappTemplate: z.string().optional().nullable().or(z.literal('')),
  silentComplete: z.boolean().optional().nullable(),
  customDate: z.string().optional().nullable().or(z.literal('')),
  customTxt: z.string().optional().nullable().or(z.literal(''))
});
