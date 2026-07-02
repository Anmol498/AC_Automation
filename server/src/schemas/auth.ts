import { z } from 'zod';

const passwordComplexitySchema = z.string()
  .min(1, { message: 'Password cannot be empty.' });

export const loginSchema = z.object({
  email: z.string().min(3),
  password: z.string().min(1)
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordComplexitySchema
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: passwordComplexitySchema,
  role: z.enum(['admin', 'superadmin', 'technician']),
  phone: z.string().optional().nullable()
});

export const forgotPasswordRequestSchema = z.object({
  email: z.string().email(),
  method: z.enum(['email', 'whatsapp'])
});

export const forgotPasswordVerifySchema = z.object({
  email: z.string().email(),
  otp: z.string().min(6).max(6)
});

export const forgotPasswordResetSchema = z.object({
  email: z.string().email(),
  resetToken: z.string().min(1),
  newPassword: passwordComplexitySchema
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: passwordComplexitySchema.optional().or(z.literal('')),
  role: z.enum(['admin', 'superadmin', 'technician']).optional(),
  phone: z.string().optional().nullable()
});

export const updateAccountInfoSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional().nullable()
});

