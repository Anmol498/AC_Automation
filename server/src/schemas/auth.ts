import { z } from 'zod';

const passwordComplexitySchema = z.string()
  .min(8, { message: 'Password must be at least 8 characters long.' })
  .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter.' })
  .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter.' })
  .regex(/\d/, { message: 'Password must contain at least one number.' })
  .regex(/[@$!%*?&#]/, { message: 'Password must contain at least one special character (@$!%*?&#).' });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordComplexitySchema
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: passwordComplexitySchema,
  role: z.enum(['admin', 'superadmin', 'technician'])
});
