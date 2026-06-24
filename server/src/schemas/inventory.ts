import { z } from 'zod';

export const inventoryItemSchema = z.object({
  modelName: z.string().min(1).max(255),
  brand: z.enum(['Mitsubishi', 'Akabishi']),
  type: z.string().min(1).max(100),
  tonnage: z.string().max(50).optional().nullable().or(z.literal('')),
  starRating: z.string().max(50).optional().nullable().or(z.literal('')),
  quantity: z.coerce.number().int().nonnegative().default(0),
  soldQuantity: z.coerce.number().int().nonnegative().default(0),
  ourPrice: z.coerce.number().nonnegative().default(0),
  salePrice: z.coerce.number().nonnegative().default(0)
});

export const copperInventorySchema = z.object({
  size: z.string().min(1),
  totalInStock: z.coerce.number().nonnegative(),
  groupName: z.string().max(100).default('Standard Sizes')
});

export const copperInventoryUpdateSchema = z.object({
  size: z.string().min(1),
  sentQty: z.coerce.number().nonnegative().default(0),
  returnQty: z.coerce.number().nonnegative().default(0)
});

export const copperSizeSchema = z.object({
  newSize: z.string().min(1)
});

export const copperGroupSchema = z.object({
  groupName: z.string().min(1).max(100)
});
