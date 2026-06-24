import { z } from 'zod';

const baseMaterialSchema = z.object({
  jobId: z.union([z.string(), z.number()]).transform(val => Number(val)),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export const copperSchema = baseMaterialSchema.extend({
  size: z.string().min(1),
  sentQty: z.coerce.number().nonnegative(),
  returnQty: z.coerce.number().nonnegative().default(0)
});

export const drainSchema = baseMaterialSchema.extend({
  usedQty: z.coerce.number().positive()
});

export const remoteSchema = baseMaterialSchema.extend({
  usedQty: z.coerce.number().positive(),
  type: z.enum(['wired', 'wireless', 'sensor'])
});

export const othersSchema = baseMaterialSchema.extend({
  description: z.string().min(1).max(500),
  qty: z.coerce.number().positive()
});

export const acModelSchema = baseMaterialSchema.extend({
  inventoryId: z.coerce.number().int().positive()
});

export const materialLogSchema = z.object({
  materialType: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  technicianName: z.string().min(1),
  items: z.array(z.object({
    itemName: z.string().min(1),
    sentQty: z.coerce.number().nonnegative().default(0),
    usedQty: z.coerce.number().nonnegative().default(0),
    returnedQty: z.coerce.number().nonnegative().default(0),
    notes: z.string().optional().nullable().or(z.literal(''))
  })).min(1)
});

export const materialLogUpdateSchema = z.object({
  materialType: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  items: z.array(z.object({
    itemName: z.string().min(1),
    sentQty: z.coerce.number().nonnegative().default(0),
    usedQty: z.coerce.number().nonnegative().default(0),
    returnedQty: z.coerce.number().nonnegative().default(0),
    notes: z.string().optional().nullable().or(z.literal(''))
  })).optional()
});
